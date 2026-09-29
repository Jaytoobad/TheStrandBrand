drop policy if exists reviews_owner_insert on public.reviews;

create policy reviews_owner_insert on public.reviews
  for insert to authenticated
  with check (
  (select auth.uid()) = user_id
  and order_id is not null
  and exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.order_id = reviews.order_id
      and oi.product_id = reviews.product_id
      and o.user_id = (select auth.uid())
      and o.status = 'delivered'
  )
);
