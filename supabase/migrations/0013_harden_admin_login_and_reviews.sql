-- ============================================================================
-- HARDEN THE ADMIN LOGIN THROTTLE, REVIEWS MODERATION AND ROLE WRITES
--
-- Review findings after the launch-hardening pass. Nothing here was reachable
-- without noticing, and the admin throttle problems are the urgent part: three
-- SECURITY DEFINER functions were granted more widely than their checks.
-- ============================================================================

-- ============================================================================
-- 1. Admin sign-in throttle
-- ============================================================================
-- The problems, in the order they matter:
--
--   a) record_admin_login_attempt() was granted to anon with no authorization
--      check, so anyone holding the public key could forge failures against a
--      real admin email. AdminLogin then called it *after* signIn() succeeded
--      and signed the admin out anyway — a correct password locked you out.
--   b) clear_admin_login_attempts() was granted to authenticated, so any
--      customer could delete any email's failures and reopen unlimited
--      password guessing.
--   c) The block was only ever checked in React state, which a reload discards.
--
-- The fix splits "is this blocked?" from "record a failure", blocks before the
-- password is ever checked, and bounds how fast failures can be recorded so
-- forging cannot hold an admin locked out indefinitely.

-- Read-only pre-flight. Stable, so it can be called before signIn() to decide
-- whether to even attempt the password. Public because the check must happen
-- for a visitor who is not signed in.
create or replace function public.is_admin_login_blocked(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*)
    from public.admin_login_attempts
    where email = lower(trim(coalesce(p_email, '')))
      and succeeded = false
      and attempted_at > now() - interval '15 minutes'
  ) >= 8;
$$;

revoke all on function public.is_admin_login_blocked(text) from public, anon, authenticated;
grant execute on function public.is_admin_login_blocked(text) to anon, authenticated, service_role;

-- Records exactly one FAILURE. There is deliberately no p_succeeded parameter:
-- a client can no longer declare a successful login, so a forged counter can
-- never sign a verified admin out.
--
-- Recording still has to be callable before sign-in (that is the point), so it
-- is open to anon — but each client may only add a handful of rows per hour.
-- A single attacker therefore cannot keep topping the count back up to 8 every
-- 15 minutes, which is what made the lockout permanent.
create or replace function public.record_admin_login_failure(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' then
    return false;
  end if;

  if not public.consume_rate_limit('admin_login_record', 20, 3600, null) then
    return not public.is_admin_login_blocked(v_email);
  end if;

  insert into public.admin_login_attempts (email, attempted_at, succeeded, ip)
  values (v_email, now(), false, null);

  return not public.is_admin_login_blocked(v_email);
end;
$$;

revoke all on function public.record_admin_login_failure(text) from public, anon, authenticated;
grant execute on function public.record_admin_login_failure(text) to anon, service_role;

-- The old combined function is removed rather than left reachable: it took a
-- client-declared success flag, which is what allowed a correct password to
-- be rejected.
drop function if exists public.record_admin_login_attempt(text, boolean, inet);

-- Clearing is an operator action, not a customer's. It is kept for the admin
-- tooling but is no longer callable by any signed-in account.
revoke all on function public.clear_admin_login_attempts(text) from public, anon, authenticated;
grant execute on function public.clear_admin_login_attempts(text) to service_role;

-- ============================================================================
-- 2. Reviews cannot be self-approved
-- ============================================================================
-- reviews_owner_insert (0005) checks that the writer owns a delivered order
-- containing the product, but nothing constrained is_approved or is_hidden.
-- PostgREST accepts whatever columns the caller sends, so a modified client
-- could post is_approved = true and have a "verified purchase" review appear
-- publicly without ever being moderated. Enforced in a trigger so it holds no
-- matter what the browser sends.
create or replace function public.review_moderation_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.is_approved := false;
    new.is_hidden := false;
  end if;
  return new;
end;
$$;

revoke all on function public.review_moderation_guard() from public, anon, authenticated;

drop trigger if exists reviews_moderation_guard on public.reviews;
create trigger reviews_moderation_guard
  before insert on public.reviews
  for each row
  execute function public.review_moderation_guard();

-- ============================================================================
-- 3. The role-protection trigger actually protects the column
-- ============================================================================
-- 0011 made protect_profile_role SECURITY DEFINER and kept a `current_user in
-- ('postgres','supabase_admin')` bypass. Inside a SECURITY DEFINER function
-- current_user is the *owner*, so that condition was always true, the function
-- always returned new, and the block beneath it was unreachable. 0010's RLS
-- still blocked self-escalation, so nothing was exploitable — but the trigger
-- layer that 0010's own header relied on was doing nothing.
--
-- Bypass on the caller's JWT instead, and let grant/revoke announce themselves
-- with a transaction-local flag. set_config(..., true) is local to the current
-- transaction, so the permission cannot outlive the statement that set it.

-- The two access functions are redefined first because they are what set that
-- flag. The authorization check inside each is unchanged from 0011; the only
-- difference is announcing the role write it is about to perform.
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

  perform set_config('app.role_change', 'on', true);
  update public.profiles set role = 'admin' where id = p_user_id;

  insert into public.admin_audit_log (actor_id, action, target_user_id, detail)
  values ((select auth.uid()), 'admin.granted', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$;

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
  if not public.is_admin() then
    raise exception 'Only an administrator can revoke admin access.' using errcode = '42501';
  end if;

  update public.admin_accounts
  set revoked_at = now(),
      revoked_by = (select auth.uid()),
      revoked_reason = coalesce(p_reason, 'Revoked from the admin panel')
  where user_id = p_user_id and revoked_at is null;

  perform set_config('app.role_change', 'on', true);
  update public.profiles set role = 'customer' where id = p_user_id;

  insert into public.admin_audit_log (actor_id, action, target_user_id, detail)
  values ((select auth.uid()), 'admin.revoked', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.grant_admin_access(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_admin_access(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_admin_access(uuid, text) to authenticated, service_role;
grant execute on function public.revoke_admin_access(uuid, text) to authenticated, service_role;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if auth.role() = 'service_role'
       or current_setting('app.role_change', true) = 'on' then
      return new;
    end if;

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

-- ============================================================================
-- 4. Only real admins can write the admin audit trail
-- ============================================================================
-- record_admin_signin() was granted to authenticated with no check, so any
-- customer could append fake "admin sign-in" rows. This log is what the
-- handover relies on, so it has to mean something.
create or replace function public.record_admin_signin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    insert into public.admin_audit_log (actor_id, action)
    values ((select auth.uid()), 'admin.signin');
  end if;
end;
$$;

revoke all on function public.record_admin_signin() from public, anon, authenticated;
grant execute on function public.record_admin_signin() to authenticated, service_role;

-- ============================================================================
-- 5. Indexes for the queries added since launch hardening
-- ============================================================================
-- Verified missing against production: reviews had only an index on product_id,
-- so the public listing (filter on is_approved/is_hidden, order by created_at)
-- and the per-customer eligible-products lookup both scanned. The abandoned
-- order sweep filters status + payment_status + created_at but only status
-- alone was indexed. All three are plain create index on tables that are
-- currently tiny, so each is non-blocking and takes no table lock.
create index if not exists idx_reviews_visible_created
  on public.reviews (is_approved, is_hidden, created_at desc);

create index if not exists idx_reviews_user
  on public.reviews (user_id);

create index if not exists idx_orders_pending_payment
  on public.orders (status, payment_status, created_at);

-- ============================================================================
-- Confirm the intended end state, or fail the migration.
-- ============================================================================
do $$
declare
  v_bad text;
begin
  select string_agg(format('%s(%s)', routine_name, grantee), ', ')
  into v_bad
  from information_schema.routine_privileges
  where routine_name in (
    'record_admin_login_attempt', 'clear_admin_login_attempts',
    'record_admin_login_failure', 'is_admin_login_blocked', 'record_admin_signin'
  )
    and grantee in ('anon', 'authenticated')
    and not (
      (routine_name = 'record_admin_login_failure' and grantee = 'anon')
      or (routine_name in ('is_admin_login_blocked', 'record_admin_signin')
          and (routine_name = 'record_admin_signin'
               or grantee in ('anon', 'authenticated')))
    );

  if v_bad is not null then
    raise exception 'Unexpected execute grants remain: %', v_bad;
  end if;

  if not exists (
    select 1 from pg_trigger
    where not tgisinternal and tgname = 'reviews_moderation_guard'
  ) then
    raise exception 'reviews_moderation_guard trigger missing';
  end if;
end $$;