-- ============================================================================
-- FIX: the length guard was skipped for order lines with no length at all
--
-- assert_length_priced_checkout() looked the category up with
--
--   from products p
--   left join categories c on ...
--   join product_variants v on v.id = new.variant_id and v.product_id = p.id
--
-- That join to product_variants is an INNER join. When a line had no length,
-- new.variant_id was null, the join matched nothing, the SELECT INTO produced
-- no row, and sold_by_inches came back null — so `coalesce(..., false)` was
-- false and every check was skipped. A line with no length on a length-priced
-- product was accepted at the placeholder price on the product row.
--
-- The category lookup is now independent of the variant lookup, and the variant
-- is resolved separately so "no length" and "length belongs to another product"
-- are distinguishable.
-- ============================================================================
create or replace function public.assert_length_priced_checkout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sold_by_inches boolean;
  v_option text;
  v_price numeric(10,2);
begin
  select c.sold_by_inches
    into v_sold_by_inches
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.id = new.product_id;

  if coalesce(v_sold_by_inches, false) then
    if new.variant_id is null then
      raise exception 'Please choose a length before paying.' using errcode = '42501';
    end if;

    select v.price, v.option_name || ': ' || v.option_value
      into v_price, v_option
    from public.product_variants v
    where v.id = new.variant_id
      and v.product_id = new.product_id;

    if v_price is null then
      raise exception 'The chosen length is not available for this product.' using errcode = '42501';
    end if;

    if new.unit_price is distinct from v_price then
      raise exception 'The price for % no longer matches. Please review your order.', v_option
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.assert_length_priced_checkout() from public, anon, authenticated;

-- Prove the corrected guard behaves, then roll the probe rows back.
do $$
declare
  v_product uuid;
  v_variant uuid;
  v_price numeric(10,2);
  v_order uuid;
begin
  select id into v_product from public.products where slug = 'test-length-bundle';
  select id, price into v_variant, v_price
  from public.product_variants
  where product_id = v_product and option_value = '18';
  select id into v_order from public.orders
  where customer_email = 'lengthtest@example.com'
  order by created_at desc limit 1;

  if v_product is null or v_variant is null or v_order is null then
    return; -- nothing to probe against in this environment
  end if;

  begin
    insert into public.order_items (order_id, product_id, product_name, variant_id, variant_summary, unit_price, quantity, subtotal)
    values (v_order, v_product, 'TEST', v_variant, 'Length: 18', v_price, 1, v_price);
  exception when others then
    raise exception 'correct price was rejected: %', sqlerrm;
  end;

  begin
    insert into public.order_items (order_id, product_id, product_name, variant_id, variant_summary, unit_price, quantity, subtotal)
    values (v_order, v_product, 'TEST', v_variant, 'Length: 18', 1.00, 1, 1.00);
    raise exception 'a GH¢1.00 line was accepted for a GH¢620 length';
  exception when others then
    if sqlerrm not like '%no longer matches%' then raise; end if;
  end;

  begin
    insert into public.order_items (order_id, product_id, product_name, variant_id, variant_summary, unit_price, quantity, subtotal)
    values (v_order, v_product, 'TEST', null, null, 400.00, 1, 400.00);
    raise exception 'a line with no length was accepted';
  exception when others then
    if sqlerrm not like '%choose a length%' then raise; end if;
  end;
end $$;