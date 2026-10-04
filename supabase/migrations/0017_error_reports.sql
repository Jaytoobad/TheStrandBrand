-- First-party error reports.
--
-- Why this is not PostHog: browser error capture there sits behind the analytics
-- cookie consent, so every customer who declines analytics produces no error
-- reports at all, and the shop owner is blind to their own storefront. PostHog is
-- also a third party, so routing operational error logs through it is a
-- cross-border transfer question under Ghana's Data Protection Act 2012 (Act 843).
--
-- Errors here go to a table this shop owns. Nothing is written when the visitor
-- is not signed in, no cookie or persistent identifier is created, and no IP
-- address is stored. Reports are therefore necessary to operate the store rather
-- than tracking, and they are disclosed in the cookie policy rather than gated on
-- consent.
--
-- Writes go through the report-error Edge Function, which uses the service role
-- after its own rate limiting. Direct inserts from the browser are deliberately
-- NOT permitted, because an open insert grant on this table is a flooding vector.
-- ----------------------------------------------------------------------------

create table if not exists public.error_reports (
  id bigint generated always as identity primary key,

  -- A stable hash of message + top stack frame, so one underlying bug is one row
  -- that counts up rather than a new row per occurrence.
  fingerprint text not null,

  message text not null,
  -- Trimmed hard: a stack trace is the most useful part of the report, and it
  -- is also the easiest thing to abuse for bulk storage.
  stack text,
  -- Where it came from: 'window' for uncaught errors and promise rejections,
  -- 'edge' for a function reporting its own failure.
  source text not null default 'window',
  -- Page the customer was on, without the query string, which can carry an
  -- email address or an order number in a shared link.
  url text,

  -- Only set when the visitor is signed in, so account-specific failures can be
  -- traced to the account that hit them. Null for anonymous visitors.
  user_id uuid references auth.users(id) on delete set null,

  -- Extra fields a caller wants to keep, e.g. { stage: 'checkout' }. Bounded by
  -- the Edge Function, not by this table.
  context jsonb,

  occurrences integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  -- Set by the owner in Admin -> Errors. Dismissed rows stop counting up but are
  -- kept, because a bug that returns months later is still worth recognising.
  resolved_at timestamptz
);

create index if not exists error_reports_unresolved_idx
  on public.error_reports (last_seen desc)
  where resolved_at is null;

create index if not exists error_reports_last_seen_idx
  on public.error_reports (last_seen desc);

-- Plain UNIQUE rather than a partial index on unresolved rows: PostgREST's upsert
-- can only target a unique index it can name, and it will not match a partial
-- one. The cost is that a returning bug reopens the row it was filed under
-- instead of starting a fresh count, which is the behaviour the owner actually
-- wants — a dismissed bug that comes back should resurface, not be quietly
-- absorbed into a closed row.
create unique index if not exists error_reports_fingerprint_key
  on public.error_reports (fingerprint);

alter table public.error_reports enable row level security;

-- No insert policy on purpose. Reports arrive only via the report-error function.
drop policy if exists error_reports_admin_read on public.error_reports;
create policy error_reports_admin_read
  on public.error_reports for select
  using (public.is_admin());

drop policy if exists error_reports_admin_update on public.error_reports;
create policy error_reports_admin_update
  on public.error_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Only the service role may delete, and nothing deletes by default: the owner
-- resolves a report in the admin UI rather than removing the evidence.
drop policy if exists error_reports_admin_delete on public.error_reports;
create policy error_reports_admin_delete
  on public.error_reports for delete
  using (public.is_admin());

-- Reports are operational data about the shop, not customer records, so they are
-- swept after a year rather than retained indefinitely.
drop function if exists public.prune_error_reports();
create function public.prune_error_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.error_reports
   where last_seen < now() - interval '365 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_error_reports() from public, anon, authenticated;
grant execute on function public.prune_error_reports() to service_role;

comment on table public.error_reports is
  'First-party error reports from the storefront. Written only by the report-error Edge Function; read and resolved in Admin -> Errors.';