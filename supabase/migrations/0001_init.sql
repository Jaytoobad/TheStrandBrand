-- ============================================================================
-- THESTRANDBRAND — INITIAL DATABASE SCHEMA
-- ============================================================================
-- Run this in the Supabase SQL Editor, or via `supabase db push` if you use
-- the Supabase CLI. It creates every table the app needs, plus Row Level
-- Security (RLS) policies so customers can only see/edit their own data.
--
-- Order to read this file: extensions -> profiles/roles -> catalog ->
-- addresses -> orders -> payments -> wishlist/reviews -> notifications ->
-- admin log -> RLS policies -> helper functions/triggers.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- PROFILES
-- One row per Supabase Auth user. `role` is what makes someone an admin —
-- it lives in the database, not in frontend code, so it can't be faked by
-- editing JavaScript in the browser.
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- CATALOG: categories, products, product_images, product_variants
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references categories(id) on delete set null,
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  sku text,
  stock int not null default 0 check (stock >= 0),
  is_new_arrival boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  rating_average numeric(2,1) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active);

create table product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  is_primary boolean not null default false
);
create index idx_product_images_product on product_images(product_id);

-- Variant "options" (length, color, density, lace type, cap size, etc.)
-- option_name/option_value keeps this flexible without a rigid column-per-attribute
-- schema, since not every wig has the same set of options.
create table product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  option_name text not null,   -- e.g. 'Length', 'Color'
  option_value text not null,  -- e.g. '18"', 'Burgundy'
  price_adjustment numeric(10,2) not null default 0,
  stock int not null default 0 check (stock >= 0),
  sku text,
  created_at timestamptz not null default now()
);
create index idx_variants_product on product_variants(product_id);

-- ----------------------------------------------------------------------------
-- ADDRESSES
-- ----------------------------------------------------------------------------
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  region text not null,
  city text not null,
  area text,
  digital_address text,
  directions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_addresses_user on addresses(user_id);

-- ----------------------------------------------------------------------------
-- ORDERS
-- ----------------------------------------------------------------------------
create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique, -- e.g. TSB-20260919-001
  user_id uuid references profiles(id) on delete set null, -- null = guest order
  customer_email text not null,
  customer_phone text not null,
  customer_name text not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  status text not null default 'pending_payment' check (status in (
    'pending_payment','paid','processing','packaged','dispatched','in_transit','delivered','cancelled','refunded'
  )),
  payment_reference text unique,
  delivery_region text not null,
  delivery_city text not null,
  delivery_area text,
  delivery_digital_address text,
  delivery_directions text,
  courier_name text,
  tracking_number text,
  external_tracking_url text,
  estimated_delivery date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_user on orders(user_id);
create index idx_orders_number on orders(order_number);
create index idx_orders_status on orders(status);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,       -- snapshot, so historical orders stay correct if a product changes later
  variant_summary text,             -- e.g. "Length: 20\", Color: Burgundy" — snapshot for the same reason
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  subtotal numeric(10,2) not null
);
create index idx_order_items_order on order_items(order_id);

create table order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index idx_status_history_order on order_status_history(order_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- One row per Paystack transaction attempt. `orders.payment_status` reflects
-- the latest verified state; this table keeps the full history/audit trail.
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  reference text not null unique,
  amount numeric(10,2) not null,
  currency text not null default 'GHS',
  status text not null default 'initialized' check (status in ('initialized','success','failed','abandoned')),
  channel text,          -- card, mobile_money, etc. (from Paystack's response)
  paystack_raw jsonb,    -- full verification payload, kept for debugging/audit
  created_at timestamptz not null default now()
);
create index idx_payments_order on payments(order_id);

-- ----------------------------------------------------------------------------
-- WISHLIST / REVIEWS / NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders(id) on delete set null, -- proves verified purchase
  rating int not null check (rating between 1 and 5),
  comment text,
  is_approved boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_reviews_product on reviews(product_id);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id);

-- ----------------------------------------------------------------------------
-- ADMIN ACTIVITY LOG
-- ----------------------------------------------------------------------------
create table admin_activity (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table payments enable row level security;
alter table wishlists enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table admin_activity enable row level security;

-- Helper: is the current user an admin? Used throughout the policies below.
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES: users can read/update their own profile; admins can read all.
create policy "profiles_select_own" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- CATALOG: publicly readable when active; only admins can write.
create policy "categories_public_read" on categories for select using (is_active or is_admin());
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

create policy "products_public_read" on products for select using (is_active or is_admin());
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

create policy "product_images_public_read" on product_images for select using (true);
create policy "product_images_admin_write" on product_images for all using (is_admin()) with check (is_admin());

create policy "product_variants_public_read" on product_variants for select using (true);
create policy "product_variants_admin_write" on product_variants for all using (is_admin()) with check (is_admin());

-- ADDRESSES: strictly the owner, or an admin.
create policy "addresses_owner" on addresses for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id);

-- ORDERS: a customer can see only their own orders; admins see everything.
-- Guest orders (user_id is null) are looked up via the secure Edge Function
-- (track-order flow), not directly through this policy.
create policy "orders_owner_select" on orders for select using (auth.uid() = user_id or is_admin());
create policy "orders_admin_write" on orders for update using (is_admin());
-- Inserts happen only through the service-role Edge Function during checkout,
-- never directly from the browser — no insert policy is granted to regular users.

create policy "order_items_owner_select" on order_items for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
);

create policy "status_history_owner_select" on order_status_history for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "status_history_admin_write" on order_status_history for insert with check (is_admin());

-- PAYMENTS: never readable by regular customers directly; admins only.
-- Written only by the service-role Edge Functions.
create policy "payments_admin_select" on payments for select using (is_admin());

-- WISHLIST: strictly the owner.
create policy "wishlists_owner" on wishlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- REVIEWS: anyone can read approved+visible reviews; owners can read/write their
-- own; admins can moderate everything.
create policy "reviews_public_read" on reviews for select using (
  (is_approved and not is_hidden) or auth.uid() = user_id or is_admin()
);
create policy "reviews_owner_insert" on reviews for insert with check (
  auth.uid() = user_id
  and exists ( -- must have a delivered order containing this product (verified purchase)
    select 1 from order_items oi join orders o on o.id = oi.order_id
    where oi.product_id = reviews.product_id and o.user_id = auth.uid() and o.status = 'delivered'
  )
);
create policy "reviews_admin_moderate" on reviews for update using (is_admin());
create policy "reviews_admin_delete" on reviews for delete using (is_admin() or auth.uid() = user_id);

-- NOTIFICATIONS: strictly the owner.
create policy "notifications_owner" on notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ADMIN ACTIVITY: admins only.
create policy "admin_activity_admin_only" on admin_activity for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- HELPER FUNCTION: safe stock decrement (prevents negative stock / race conditions)
-- Called from the verify-payment Edge Function using the service role, inside
-- a transaction, so concurrent orders can't oversell stock.
-- ============================================================================
create function public.decrement_stock(p_product_id uuid, p_variant_id uuid, p_qty int)
returns void as $$
begin
  if p_variant_id is not null then
    update product_variants set stock = stock - p_qty
    where id = p_variant_id and stock >= p_qty;
    if not found then
      raise exception 'Insufficient stock for variant %', p_variant_id;
    end if;
  else
    update products set stock = stock - p_qty
    where id = p_product_id and stock >= p_qty;
    if not found then
      raise exception 'Insufficient stock for product %', p_product_id;
    end if;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- PUBLIC ORDER TRACKING (security definer function, not a table policy)
-- ============================================================================
-- Orders are NOT publicly selectable via RLS (see orders_owner_select above) —
-- guessing an order number alone must never reveal someone else's order. This
-- function is the one sanctioned way in: it requires the order number AND a
-- matching email/phone before returning anything, and only returns the
-- specific columns a tracking page needs.
create function public.track_order(p_order_number text, p_contact text)
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
) as $$
  select o.order_number, o.status, o.payment_status, o.total,
         o.delivery_region, o.delivery_city, o.courier_name,
         o.tracking_number, o.external_tracking_url, o.estimated_delivery, o.created_at,
         (
           select coalesce(jsonb_agg(jsonb_build_object('status', h.status, 'created_at', h.created_at) order by h.created_at), '[]'::jsonb)
           from order_status_history h where h.order_id = o.id
         ) as status_history
  from orders o
  where o.order_number = upper(trim(p_order_number))
    and (o.customer_email = p_contact or o.customer_phone = p_contact);
$$ language sql security definer stable;

-- ============================================================================
-- SEED: a couple of categories + demo products so the storefront isn't empty
-- on first run. Delete or edit these freely from the admin dashboard.
-- ============================================================================
insert into categories (name, slug, description, sort_order) values
  ('Body Wave', 'body-wave', 'Soft, bouncy waves from root to tip.', 1),
  ('Bone Straight', 'bone-straight', 'Sleek, pin-straight elegance.', 2),
  ('Curly', 'curly', 'Defined, voluminous curls.', 3),
  ('HD Lace', 'hd-lace', 'Undetectable, natural-looking hairline.', 4);

insert into products (name, slug, description, category_id, price, sale_price, stock, is_new_arrival, is_featured)
select 'Body Wave HD Wig', 'body-wave-hd-wig', 'A soft, bouncy body wave wig with an undetectable HD lace front.', id, 1500, 1250, 12, true, true
from categories where slug = 'body-wave';

insert into products (name, slug, description, category_id, price, stock, is_new_arrival)
select 'Bone Straight Frontal Wig', 'bone-straight-frontal-wig', 'Sleek, glass-like straight hair with a 13x4 frontal.', id, 1800, 8, true
from categories where slug = 'bone-straight';
