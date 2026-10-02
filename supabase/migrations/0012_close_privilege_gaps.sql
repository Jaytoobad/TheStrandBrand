-- ============================================================================
-- CLOSE TWO LEFTOVER PRIVILEGE GAPS
-- Found while auditing the launch build. Neither is currently exploitable —
-- RLS is what is actually stopping both — but both relied on a single
-- accidental safeguard, so both are closed properly here.
-- ============================================================================

-- 1. admin_login_attempts had RLS switched off.
--    It is unreachable today only because no grants were ever given on it.
--    That is a privilege-by-omission, not a security control: a later
--    `grant select to authenticated` for an admin dashboard would silently
--    publish every recorded admin login (emails and IPs) to the client.
--    The table tracks failed admin sign-ins, so it should never be readable
--    from the browser at all — only written by the definer functions that
--    use it, which run as their owner and ignore RLS.
alter table public.admin_login_attempts enable row level security;

-- 2. rate_limit_counters was granted to anon.
--    RLS is on with no policies, so SELECT returns nothing and writes are
--    refused — the comment in 0008 is accurate today. But the grants are
--    unnecessary and are a loaded gun: adding any policy to this table for a
--    legitimate reason would simultaneously hand the browser INSERT and
--    UPDATE, letting anyone forge counters and switch the abuse limiter off.
--    Only the SECURITY DEFINER functions (running as owner) and the Edge
--    Functions (service_role) ever need it.
revoke all on table public.rate_limit_counters from anon, authenticated;

-- Confirm the intended end state.
do $$
declare
  v_rls_off int;
  v_grants int;
begin
  select count(*) into v_rls_off
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  select count(*) into v_grants
  from information_schema.role_table_grants
  where grantee in ('anon', 'authenticated')
    and table_name in ('rate_limit_counters', 'admin_login_attempts');

  if v_rls_off > 0 then
    raise exception 'Still % public table(s) without RLS', v_rls_off;
  end if;
  if v_grants > 0 then
    raise exception 'Still % browser grant(s) on internal tables', v_grants;
  end if;
end $$;
