-- ============================================================================
-- DELIVERY RATES — one delivery fee per Ghana region.
-- Checkout reads these to show the fee; the initialize-payment Edge Function
-- reads them again on the server, so the amount charged can't be changed from
-- the browser. Admins edit the fees in Admin → Settings.
-- ============================================================================

create table if not exists public.delivery_rates (
  region text primary key,
  fee numeric(10,2) not null check (fee >= 0 and fee <= 5000),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.delivery_rates enable row level security;

drop policy if exists "delivery_rates_public_read" on public.delivery_rates;
create policy "delivery_rates_public_read" on public.delivery_rates
  for select using (true);

-- Admins can change fees but not add or remove regions (the region list is
-- fixed to Ghana's 16 regions and matches the checkout dropdown).
drop policy if exists "delivery_rates_admin_update" on public.delivery_rates;
create policy "delivery_rates_admin_update" on public.delivery_rates
  for update using (public.is_admin()) with check (public.is_admin());

grant select on public.delivery_rates to anon, authenticated;
grant update on public.delivery_rates to authenticated;

-- Starting fees: GH₵35 in Greater Accra (confirmed by the owner). Other regions
-- sit in the GH₵45–60 range by distance from Accra; the owner should confirm
-- these in Admin → Settings.
insert into public.delivery_rates (region, fee, sort_order) values
  ('Greater Accra', 35, 1),
  ('Ashanti',       50, 2),
  ('Western',       50, 3),
  ('Central',       45, 4),
  ('Eastern',       45, 5),
  ('Volta',         45, 6),
  ('Northern',      60, 7),
  ('Upper East',    60, 8),
  ('Upper West',    60, 9),
  ('Bono',          55, 10),
  ('Bono East',     55, 11),
  ('Ahafo',         55, 12),
  ('Western North', 55, 13),
  ('Oti',           50, 14),
  ('Savannah',      60, 15),
  ('North East',    60, 16)
on conflict (region) do nothing;
