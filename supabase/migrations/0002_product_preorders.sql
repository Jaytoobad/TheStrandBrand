alter table public.products
  add column if not exists allow_preorder boolean not null default true;

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
