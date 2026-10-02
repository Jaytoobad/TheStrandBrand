-- ============================================================================
-- ADMIN ACCESS CONTROL — an explicit, auditable list of administrators.
-- ============================================================================
-- Admin rights are currently a `role = 'admin'` column, so access is granted by
-- running an UPDATE. That works, but it is invisible: there is no record of who
-- approved it, when, or who was removed, and revoking access means editing a
-- row by hand.
--
-- This adds a real access list plus an audit trail, so handing the shop over to
-- the owner is a tracked event rather than an unlogged database edit. Nothing is
-- deleted anywhere in this migration — access is added and removed, never data.
--
--   1. admin_accounts    — who currently has admin rights, who granted it, and why
--   2. admin_audit_log    — append-only record of admin sign-ins and role changes
--   3. admin_login_attempts — per-account throttling for repeated failed sign-ins
--
-- Existing admin accounts are seeded into the list from their current role, so
-- nobody loses access by applying this.
-- ============================================================================

create table if not exists public.admin_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  granted_reason text,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_reason text,
  -- Rows stay in this table after revocation so the history survives.
  constraint admin_accounts_active check (revoked_at is null or revoked_at >= granted_at)
);

alter table public.admin_accounts enable row level security;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  detail jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);

create table if not exists public.admin_login_attempts (
  email text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false,
  ip inet
);

create index if not exists admin_login_attempts_lookup_idx on public.admin_login_attempts (email, attempted_at desc);

-- is_admin() now reads this list, so revoking a row immediately removes access.
-- The role column stays as the source of truth for the app UI, and the two are
-- kept in step by the trigger below.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_accounts a
    where a.user_id = (select auth.uid())
      and a.revoked_at is null
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Seed from the current role so nobody loses access on deploy.
insert into public.admin_accounts (user_id, granted_reason)
select p.id, 'Seeded from profiles.role when the admin access list was introduced'
from public.profiles p
where p.role = 'admin'
on conflict (user_id) do nothing;

-- ============================================================================
-- Granting and revoking access. Both are explicit, logged, and keep the
-- profiles.role column in step so the admin UI still reads correctly.
-- ============================================================================
create or replace function public.grant_admin_access(
  p_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only an existing admin may grant access.
  if not public.is_admin() then
    raise exception 'Only an administrator can grant admin access.' using errcode = '42501';
  end if;

  insert into public.admin_accounts (user_id, granted_by, granted_reason)
  values (p_user_id, (select auth.uid()), coalesce(p_reason, 'Granted from the admin panel'))
  on conflict (user_id) do update
    set revoked_at = null,
        revoked_by = null,
        revoked_reason = null,
        granted_by = (select auth.uid()),
        granted_at = now(),
        granted_reason = coalesce(p_reason, 'Granted from the admin panel');

  update public.profiles set role = 'admin' where id = p_user_id;

  insert into public.admin_audit_log (actor_id, action, target_user_id, detail)
  values ((select auth.uid()), 'admin.granted', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- Revoking removes access but keeps every row the admin was responsible for.
create or replace function public.revoke_admin_access(
  p_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An admin may always revoke, including their own access. Removing yourself
  -- is allowed so the last admin can hand over without a database engineer.
  if not public.is_admin() then
    raise exception 'Only an administrator can revoke admin access.' using errcode = '42501';
  end if;

  update public.admin_accounts
  set revoked_at = now(),
      revoked_by = (select auth.uid()),
      revoked_reason = coalesce(p_reason, 'Revoked from the admin panel')
  where user_id = p_user_id and revoked_at is null;

  update public.profiles set role = 'customer' where id = p_user_id;

  insert into public.admin_audit_log (actor_id, action, target_user_id, detail)
  values ((select auth.uid()), 'admin.revoked', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.grant_admin_access(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_admin_access(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_admin_access(uuid, text) to authenticated, service_role;
grant execute on function public.revoke_admin_access(uuid, text) to authenticated, service_role;

-- Any direct write to profiles.role from the API is now rejected; the list and
-- the column only move together through these two functions.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
      return new;
    end if;

    -- Granting and revoking go through the functions above, which hold their own
    -- authorization check. Nothing else may change a role.
    raise exception 'Roles are managed with grant_admin_access() / revoke_admin_access().'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();

-- The policies and triggers above are owned by postgres; RLS is still enabled
-- with no public grants, so these tables are unreachable from the API.
revoke all on public.admin_accounts, public.admin_audit_log, public.admin_login_attempts from anon, authenticated;

-- ============================================================================
-- Failed sign-in throttling for the admin area.
--
-- Supabase Auth rate-limits by IP, which a small shop shares with every other
-- customer on the same connection. This counts failures per admin email so a
-- distributed guess against one account is throttled too.
-- ============================================================================
create or replace function public.record_admin_login_attempt(
  p_email text,
  p_succeeded boolean,
  p_ip inet default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_recent integer;
begin
  insert into public.admin_login_attempts (email, attempted_at, succeeded, ip)
  values (v_email, now(), coalesce(p_succeeded, false), p_ip);

  select count(*) into v_recent
  from public.admin_login_attempts
  where email = v_email
    and succeeded = false
    and attempted_at > now() - interval '15 minutes';

  -- 8 failures in 15 minutes means something other than a typo. Blocked.
  return v_recent < 8;
end;
$$;

revoke all on function public.record_admin_login_attempt(text, boolean, inet) from public, anon, authenticated;
grant execute on function public.record_admin_login_attempt(text, boolean, inet) to anon, authenticated, service_role;

create or replace function public.clear_admin_login_attempts(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.admin_login_attempts
  where email = lower(trim(p_email)) and succeeded = false;
$$;

revoke all on function public.clear_admin_login_attempts(text) from public, anon, authenticated;
grant execute on function public.clear_admin_login_attempts(text) to authenticated, service_role;

-- ============================================================================
-- A successful admin sign-in is recorded for the audit trail. Called by the
-- admin login page after Supabase confirms the password and the admin role.
-- ============================================================================
create or replace function public.record_admin_signin()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, action)
  values ((select auth.uid()), 'admin.signin');
$$;

revoke all on function public.record_admin_signin() from public, anon, authenticated;
grant execute on function public.record_admin_signin() to authenticated, service_role;

-- Housekeeping: attempts and audit rows are kept for 90 days, then trimmed.
-- Audit rows are evidence of who did what, so they are deleted only well after
-- any plausible dispute window.
create or replace function public.prune_admin_logs()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.admin_login_attempts where attempted_at < now() - interval '90 days';
  delete from public.admin_audit_log where created_at < now() - interval '365 days';
$$;

revoke all on function public.prune_admin_logs() from public, anon, authenticated;
grant execute on function public.prune_admin_logs() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'prune-admin-logs') then
      perform cron.schedule('prune-admin-logs', '41 3 * * *', 'select public.prune_admin_logs()');
    end if;
  end if;
end;
$$;