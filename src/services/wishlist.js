import { supabase } from '../lib/supabaseClient';

export async function fetchWishlist(userId) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('id, product_id, products(*, product_images(url, is_primary))')
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
