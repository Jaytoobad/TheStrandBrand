-- ============================================================================
-- ADMIN SECURITY — stop any signed-in user from granting themselves admin.
-- ============================================================================
-- profiles_update_own let a user update their OWN row, and RLS row policies do
-- not restrict WHICH columns may be written. That meant any customer could run
--
--   PATCH /rest/v1/profiles?id=eq.<their own id>   {"role": "admin"}
--
-- from the browser console and become a full administrator: orders, payments,
-- customer details and every admin table became readable and writable, because
-- every admin policy defers to is_admin(). Verified live against production on
-- 2 October 2026.
--
-- The fix keeps `profiles_update_own` (people must still edit their own name and
-- phone) but moves the `role` column behind an admin-only trigger. Writing your
-- own role is no longer something the request can do, however it is phrased.
-- ============================================================================

-- Guard: only an admin may change a role, and never from the public API.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    -- service_role passes through (Edge Functions, migrations, the cron jobs),
    -- and so does postgres/the table owner doing a deliberate promotion.
    if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
      return new;
    end if;

    if not public.is_admin() then
      raise exception 'Only an administrator can change a user role.'
        using errcode = '42501';
    end if;
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

-- Belt and braces: also block `role` in the RLS policy itself, so a caller that
-- somehow bypasses triggers still cannot store a new role through the API.
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- The stored role must be unchanged, so it can only ever match the role the
    -- row already had. is_admin() reads the row as it exists in storage.
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );
