create unique index if not exists reviews_order_product_user_unique
  on public.reviews (order_id, product_id, user_id)
  where order_id is not null;
