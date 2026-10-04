import { supabase } from '../lib/supabaseClient';

export async function fetchWishlist(userId) {
  const { data, error } = await supabase
    .from('wishlists')
    // categories and product_variants are required, not decorative: without them
    // a sold-by-length product cannot be recognised, so its placeholder price
    // would be shown and its deliberate stock of 0 would read as sold out.
    .select('id, product_id, products(*, categories(name, slug, sold_by_inches), product_images(url, is_primary), product_variants(id, price, stock, sort_order))')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function addToWishlist(userId, productId) {
  const { error } = await supabase.from('wishlists').insert({ user_id: userId, product_id: productId });
  if (error && error.code !== '23505') throw error; // ignore "already wishlisted" duplicate
}

export async function removeFromWishlist(userId, productId) {
  const { error } = await supabase.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId);
  if (error) throw error;
}
