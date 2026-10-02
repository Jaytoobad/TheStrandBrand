import { supabase } from '../lib/supabaseClient';

// Insert is only allowed by RLS for customers with a *delivered* order
// containing this product — see reviews_owner_insert policy. New reviews
// start unapproved and appear once an admin approves them.
export async function submitReview({ productId, orderId, rating, comment, userId }) {
  const { error } = await supabase.from('reviews').insert({
    product_id: productId,
    order_id: orderId,
    user_id: userId,
    rating,
    comment,
  });
  if (error) throw error;
}

export async function fetchReviewedProductIds(orderId, userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('product_id')
    .eq('order_id', orderId)
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((review) => review.product_id);
}

// Public list of approved reviews, newest first. RLS means an anonymous visitor
// can only ever see approved, unhidden reviews — the same rows the storefront
// shows. `products` may be null if a product was archived after the review was
// written, so callers must handle a missing product.
export async function fetchApprovedReviewsPage(limit = 200) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, products(id, name, slug)')
    .eq('is_approved', true)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Products this customer has already paid for and received (the only ones
// RLS will accept a review for) minus the ones they have already reviewed.
export async function fetchReviewableProducts(userId) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_items(product_id, product_name, products(id, slug))')
    .eq('user_id', userId)
    .eq('status', 'delivered');
  if (error) throw error;

  const { data: existing, error: existingError } = await supabase
    .from('reviews')
    .select('order_id, product_id')
    .eq('user_id', userId);
  if (existingError) throw existingError;

  const alreadyReviewed = new Set((existing || []).map((r) => `${r.order_id}:${r.product_id}`));
  const seen = new Set();
  const eligible = [];

  for (const order of orders || []) {
    for (const item of order.order_items || []) {
      const key = `${order.id}:${item.product_id}`;
      if (!item.product_id || alreadyReviewed.has(key) || seen.has(key)) continue;
      seen.add(key);
      eligible.push({
        orderId: order.id,
        productId: item.product_id,
        productName: item.product_name,
        productSlug: item.products?.slug ?? null,
      });
    }
  }

  return eligible;
}
