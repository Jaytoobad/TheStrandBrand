-- ============================================================================
-- ABANDONED CHECKOUTS — expire unpaid orders and prune stale rate-limit rows.
-- ============================================================================
-- Every checkout attempt creates an order in 'pending_payment'. If the customer
-- abandons the Paystack page, that order stays pending forever and quietly
-- skews order counts and revenue reporting. pg_cron expires them daily and
-- removes old rate-limit counters in the same pass.
-- ============================================================================

-- 'expired' means "checkout was started but never paid", which is different
-- from 'cancelled' (an order that was paid and then called off).
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'pending_payment', 'paid', 'processing', 'packaged', 'dispatched',
    'in_transit', 'delivered', 'cancelled', 'refunded', 'expired'
  ));

-- Returns how many orders it expired, so the job's result is visible in logs.
create or replace function public.expire_abandoned_orders(p_older_than interval default interval '3 days')
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  -- The payment_status of an expired order is 'failed' because Paystack never
  -- reported a successful charge. If a late payment does arrive, the webhook
  -- still fulfils it and sets both values back to paid.
  with expired as (
    update public.orders o
    set status = 'expired',
        payment_status = 'failed',
        updated_at = now()
    where o.status = 'pending_payment'
      and o.payment_status = 'pending'
      and o.created_at < now() - p_older_than
    returning o.id
  )
  insert into public.order_status_history (order_id, status, note)
  select id,
         'expired',
         'Checkout was never completed and no payment was received. Expired automatically.'
  from expired;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_abandoned_orders(interval) from public, anon, authenticated;
grant execute on function public.expire_abandoned_orders(interval) to service_role;

create extension if not exists pg_cron with schema pg_catalog;

-- Guarded so re-running this migration never queues duplicate jobs.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'expire-abandoned-orders') then
    perform cron.schedule(
      'expire-abandoned-orders',
      '17 * * * *', -- hourly, off the :00 spike
      'select public.expire_abandoned_orders()'
    );
  end if;

  if not exists (select 1 from cron.job where jobname = 'prune-rate-limit-counters') then
    perform cron.schedule(
      'prune-rate-limit-counters',
      '23 3 * * *',
      'select public.prune_rate_limit_counters()'
    );
  end if;
end;
$$;