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
