create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.decrement_stock(p_product_id uuid, p_variant_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_variant_id is not null then
    update public.product_variants set stock = stock - p_qty
    where id = p_variant_id and stock >= p_qty;
    if not found then
      raise exception 'Insufficient stock for variant %', p_variant_id;
    end if;
  else
    update public.products set stock = stock - p_qty
    where id = p_product_id and stock >= p_qty;
    if not found then
      raise exception 'Insufficient stock for product %', p_product_id;
    end if;
  end if;
end;
$$;

create or replace function public.track_order(p_order_number text, p_contact text)
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
language sql
security definer
stable
set search_path = ''
as $$
  select o.order_number, o.status, o.payment_status, o.total,
         o.delivery_region, o.delivery_city, o.courier_name,
         o.tracking_number, o.external_tracking_url, o.estimated_delivery, o.created_at,
         (
           select coalesce(jsonb_agg(jsonb_build_object('status', h.status, 'created_at', h.created_at) order by h.created_at), '[]'::jsonb)
           from public.order_status_history h where h.order_id = o.id
         ) as status_history
  from public.orders o
  where o.order_number = upper(trim(p_order_number))
    and (o.customer_email = p_contact or o.customer_phone = p_contact);
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public;
revoke all on function public.decrement_stock(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.track_order(text, text) from public;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.decrement_stock(uuid, uuid, int) to service_role;
grant execute on function public.track_order(text, text) to anon, authenticated;
