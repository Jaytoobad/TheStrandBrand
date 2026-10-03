import { supabase } from '../lib/supabaseClient';
import { displayPrice } from '../lib/pricing';

// Every read here only ever sees active/public rows thanks to RLS —
// no need to filter is_active client-side for security, though we still
// do it for correctness/clarity.

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchProducts({ categorySlug, isNewArrival, isFeatured, search, sort } = {}) {
  let query = supabase
    .from('products')
    // sold_by_inches and the variants are needed so a length-priced product can
    // show "from <cheapest length>" instead of a misleading single price or an
    // out-of-stock badge derived from the product row.
    .select('*, categories(name, slug, sold_by_inches), product_images(url, is_primary, sort_order), product_variants(id, price, stock)')
    .eq('is_active', true);

  if (categorySlug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    if (cat) query = query.eq('category_id', cat.id);
  }
  if (isNewArrival) query = query.eq('is_new_arrival', true);
  if (isFeatured) query = query.eq('is_featured', true);
  if (search) query = query.ilike('name', `%${search}%`);

  switch (sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'newest': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
// Sort by the price customers actually pay, so sale items and length-priced
// products land in the right place.
if (sort === 'price_asc' || sort === 'price_desc') {
    const direction = sort === 'price_asc' ? 1 : -1;
    return [...data].sort((a, b) => (displayPrice(a) - displayPrice(b)) * direction);
  }
  return data;
}

// Current prices for the products in a cart, so the cart never shows an old
// price after the shop changes it (the server always charges today's price).
export async function fetchCartPrices(productIds) {
  const { data, error } = await supabase
    .from('products')
    .select('id, price, sale_price, is_active, product_variants(id, price, price_adjustment)')
    .in('id', productIds);
  if (error) throw error;
  return data;
}

export async function fetchProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug, sold_by_inches), product_images(*), product_variants(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchApprovedReviews(productId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(first_name, last_name)')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
