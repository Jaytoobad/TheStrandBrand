-- ============================================================================
-- SELL CERTAIN CATEGORIES BY LENGTH (INCHES)
--
-- Wig Bundles are not sold at one price. A bundle is sold strictly by its
-- length, and each length carries its own price and its own stock. The existing
-- product_variants table was built for "price_adjustment" — a signed delta on
-- top of the product price — which forces the merchant to do arithmetic by hand
-- and gives no way to record a real price per length.
--
-- This adds that missing capability without changing how any existing category
-- behaves:
--
--   * categories.sold_by_inches  — the opt-in. Only categories flagged here get
--     the per-length treatment; every other product keeps using price_adjustment
--     exactly as before. It lives on the category rather than being matched by
--     name so renaming the category cannot silently switch the behaviour off.
--
--   * product_variants.price     — an absolute price for that length. NULL keeps
--     the old behaviour (product price + adjustment), so nothing that exists
--     today changes meaning.
--
--   * product_variants.sort_order — lengths have a natural order (10 before 22).
--     The storefront read this table with no ORDER BY, so pill order was
--     whatever Postgres returned.
--
--   * a unique index on (product_id, option_name, option_value) so the same
--     length cannot be entered twice, which would render two identical pills.
-- ============================================================================

-- 1. The opt-in flag, on the category so it survives a rename.
alter table public.categories
  add column if not exists sold_by_inches boolean not null default false;

comment on column public.categories.sold_by_inches is
  'When true, products in this category are sold strictly by length: each length is a product variant carrying its own absolute price and stock.';

-- 2. Absolute per-length price. NULL means "use price_adjustment as before".
alter table public.product_variants
  add column if not exists price numeric(10,2) check (price is null or price >= 0);

comment on column public.product_variants.price is
  'Absolute price for this option when the parent category is sold by length. Null falls back to products.price + price_adjustment.';

-- 3. Natural display order for options.
alter table public.product_variants
  add column if not exists sort_order int not null default 0;

-- 4. No duplicate lengths, and a cheap ordered read per product.
create unique index if not exists uq_product_variants_option
  on public.product_variants (product_id, option_name, option_value);

create index if not exists idx_variants_product_ordered
  on public.product_variants (product_id, sort_order);

-- Existing rows have no meaningful order yet; give them a stable one so the
-- storefront does not reshuffle every render.
with ranked as (
  select
    id,
    row_number() over (
      partition by product_id, option_name
      order by nullif(regexp_replace(option_value, '[^0-9.]', '', 'g'), '')::numeric, option_value
    ) as rn
  from public.product_variants
)
update public.product_variants v
set sort_order = r.rn
from ranked r
where v.id = r.id and v.sort_order = 0;

-- 5. Options of a deactivated product should not be publicly readable. The
--    policy was using(true) for every row, unlike products_public_read, which
--    scopes to active products. Prices of hidden products are not public
--    information.
drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read"
  on public.product_variants
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.is_active or public.is_admin())
    )
  );

-- 6. A sold-by-inches order line must name a length, and must be priced at that
--    length's price. Enforced on the order line rather than on save, because the
--    product row and its variants are written separately and a half-finished save
--    must not be able to block a legitimate edit.
create or replace function public.assert_length_priced_checkout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sold_by_inches boolean;
  v_option text;
begin
  select c.sold_by_inches, v.option_name || ': ' || v.option_value
    into v_sold_by_inches, v_option
  from public.products p
  left join public.categories c on c.id = p.category_id
  join public.product_variants v on v.id = new.variant_id and v.product_id = p.id
  where p.id = new.product_id;

  if coalesce(v_sold_by_inches, false) then
    if new.variant_id is null then
      raise exception 'Please choose a length before paying.' using errcode = '42501';
    end if;
    if new.unit_price is distinct from (
      select v.price from public.product_variants v where v.id = new.variant_id
    ) then
      raise exception 'The price for % no longer matches. Please review your order.', v_option
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.assert_length_priced_checkout() from public, anon, authenticated;

drop trigger if exists order_items_require_length on public.order_items;
create trigger order_items_require_length
  before insert on public.order_items
  for each row
  execute function public.assert_length_priced_checkout();

-- 7. Opt the existing category in, by slug so this is repeatable in any
--    environment. Everything else stays false.
update public.categories
set sold_by_inches = true
where slug = 'wig-bundles';

-- Confirm the shape the code above assumes, or fail.
do $$
declare
  v_expected constant text[][] := array[
    array['categories', 'sold_by_inches'],
    array['product_variants', 'price'],
    array['product_variants', 'sort_order']
  ];
  v_pair text[];
  v_missing text;
begin
  foreach v_pair slice 1 in array v_expected loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = v_pair[1]
        and column_name = v_pair[2]
    ) then
      v_missing := coalesce(v_missing || ', ', '') || v_pair[1] || '.' || v_pair[2];
    end if;
  end loop;

  if v_missing is not null then
    raise exception 'Expected columns missing after migration: %', v_missing;
  end if;

  if not exists (
    select 1 from pg_trigger where not tgisinternal and tgname = 'order_items_require_length'
  ) then
    raise exception 'order_items_require_length trigger missing';
  end if;
end $$;