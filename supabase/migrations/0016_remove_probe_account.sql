-- Remove the throwaway account created while diagnosing the admin login.
--
-- A test signup was made against production to reproduce the sign-in behaviour.
-- It is unconfirmed and cannot sign in, but leaving stray accounts in
-- auth.users is untidy and it is an address under example.invalid, which some
-- mail providers reject. It has to be deleted from auth.users rather than
-- public.profiles: the profile row cascades from the auth row.
--
-- Guarded to that one exact address. A broader "delete unconfirmed users" sweep
-- would be dangerous here, because a real customer mid-signup is also
-- unconfirmed and must not be removed.

do $$
declare
  v_deleted int;
begin
  delete from auth.users
   where email = 'probe.1791080405227@example.invalid';

  get diagnostics v_deleted = row_count;

  if v_deleted > 1 then
    raise exception 'Expected at most one probe account, deleted %', v_deleted;
  end if;

  raise notice 'Removed % probe account(s)', v_deleted;
end
$$;