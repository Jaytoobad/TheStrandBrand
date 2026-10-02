-- ============================================================================
-- RATE LIMITING — abuse protection for public, unauthenticated endpoints.
-- ============================================================================
-- Two public surfaces can be abused without an account:
--   1. Guest checkout  → initialize-payment Edge Function (creates orders,
--      stock writes and Paystack transactions, so it costs real money).
--   2. Public tracking → track_order() (guesses order numbers + emails).
-- This migration adds the shared counter table and the single function both
-- use. Limits are generous enough for shared/CGNAT mobile networks in Ghana
-- but stop scripted abuse.
--
-- Counters are only ever written by the SECURITY DEFINER functions below, and
-- the table has RLS enabled with no policies, so nothing can read or forge
-- them through the public API.
-- ============================================================================

create table if not exists public.rate_limit_counters (
  scope text not null,
  identifier text not null,
  window_started_at timestamptz not null default now(),
  hits int not null default 0,
  primary key (scope, identifier)
);

alter table public.rate_limit_counters enable row level security;

create index if not exists rate_limit_counters_window_idx
  on public.rate_limit_counters (window_started_at);

-- Best-effort cleanup of counters nobody will read again. Runs on a small
-- random fraction of calls so it never sits in the hot path.
create or replace function public.prune_rate_limit_counters()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limit_counters
  where window_started_at < now() - interval '2 days';
$$;

-- ============================================================================
-- consume_rate_limit — atomically count one call and report whether it is
-- allowed. Returns true when the caller is within the limit, false when the
-- limit for this window has been reached.
--
-- p_identifier is passed explicitly by the Edge Functions (which know the
-- caller's IP address). When it is null the caller's IP is derived from
-- PostgREST's request headers instead, which is what the browser-facing
-- track_order_limited() function relies on.
-- ============================================================================
create or replace function public.consume_rate_limit(
  p_scope text,
  p_limit int,
  p_window_seconds int,
  p_identifier text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identifier text;
  v_hits int;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  v_identifier := coalesce(
    nullif(trim(p_identifier), ''),
    nullif(
      split_part(
        coalesce(
          nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''),
          nullif(nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip', '')
        ),
        ',',
        1
      ),
      ''
    ),
    'unknown'
  );

  -- One atomic upsert: start a fresh window or add to the current one, so
  -- concurrent requests from the same caller cannot slip past the limit.
  insert into public.rate_limit_counters as c (scope, identifier, window_started_at, hits)
  values (p_scope, v_identifier, now(), 1)
  on conflict (scope, identifier) do update
    set hits = case
          when c.window_started_at < now() - make_interval(secs => p_window_seconds) then 1
          else c.hits + 1
        end,
        window_started_at = case
          when c.window_started_at < now() - make_interval(secs => p_window_seconds) then now()
          else c.window_started_at
        end
  returning hits into v_hits;

  if random() < 0.02 then
    perform public.prune_rate_limit_counters();
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int, text) from public, anon, authenticated;
revoke all on function public.prune_rate_limit_counters() from public, anon, authenticated;

-- Edge Functions call this with the service-role client; browsers cannot.
grant execute on function public.consume_rate_limit(text, int, int, text) to service_role;
grant execute on function public.prune_rate_limit_counters() to service_role;

-- ============================================================================
-- PUBLIC ORDER TRACKING, RATE LIMITED
-- ============================================================================
-- track_order() itself stays exactly as written in 0001/0006 and keeps
-- requiring the order number AND a matching email/phone. It just stops being
-- callable by browsers directly: track_order_limited() below is the only
-- entry point, and it spends one rate-limit token per attempt.
--
-- The token is charged per caller IP rather than per guessed order number,
-- because a per-order-number limit would leak how often a real order number
-- is being probed.
create or replace function public.track_order_limited(p_order_number text, p_contact text)
returns table (
  order_number text,
  status text,
  payment_status text,
  total numeric,
  delivery_region text,
  delivery_city text,
  courier_name text,
  tracking_number text,
  external_tracking_url text,
  estimated_delivery date,
  created_at timestamptz,
  status_history jsonb
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.consume_rate_limit('track_order', 15, 600, null) then
    raise exception 'Too many tracking attempts. Please wait a few minutes and try again.'
      using errcode = 'P0001';
  end if;

  return query
    select * from public.track_order(p_order_number, p_contact);
end;
$$;

revoke all on function public.track_order_limited(text, text) from public;
revoke all on function public.track_order(text, text) from anon, authenticated;

grant execute on function public.track_order_limited(text, text) to anon, authenticated, service_role;