alter table public.orders
  add column if not exists refund_policy_accepted_at timestamptz,
  add column if not exists refund_policy_version text;
