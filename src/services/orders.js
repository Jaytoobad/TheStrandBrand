import { getPostHogHeaders } from '../lib/posthog';
import { supabase } from '../lib/supabaseClient';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// These two calls hit the secure Edge Functions rather than writing to the
// `orders`/`payments` tables directly — pricing, stock checks and payment
// verification all happen server-side. See supabase/functions/.

export async function initializePayment(payload) {
  const res = await fetch(`${FUNCTIONS_BASE}/initialize-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPostHogHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Could not start payment.');
    err.code = data.code; // e.g. 'delivery_fee_changed'
    throw err;
  }
  return data;
}

export async function verifyPayment(reference) {
  const res = await fetch(`${FUNCTIONS_BASE}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPostHogHeaders() },
    body: JSON.stringify({ reference }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not verify payment.');
  return data;
}

export async function fetchMyOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*)')
    .eq('id', orderId)
    .single();
  if (error) throw error;

  const productIds = [...new Set((data.order_items || []).map((item) => item.product_id).filter(Boolean))];
  if (!productIds.length) return data;

  const { data: images, error: imageError } = await supabase
    .from('product_images')
    .select('product_id, url, is_primary, sort_order')
    .in('product_id', productIds)
    .order('sort_order');
  if (imageError) return data;

  const imagesByProduct = new Map();
  for (const image of images || []) {
    const productImages = imagesByProduct.get(image.product_id) || [];
    productImages.push(image);
    imagesByProduct.set(image.product_id, productImages);
  }

  return {
    ...data,
    order_items: data.order_items.map((item) => ({
      ...item,
      product_images: imagesByProduct.get(item.product_id) || [],
    })),
  };
}

// Public order tracking: calls the track_order_limited() database function,
// which requires BOTH the order number and a matching email/phone before it
// returns anything and rate-limits attempts per caller IP — see
// supabase/migrations/0001_init.sql and 0008_rate_limiting.sql. This means a
// stranger who only guesses an order number learns nothing.
export async function trackOrder({ orderNumber, contact }) {
  const { data, error } = await supabase.rpc('track_order_limited', {
    p_order_number: orderNumber.trim(),
    p_contact: contact.trim(),
  });
  if (error) {
    const rateLimited = /too many/i.test(error.message || '');
    throw new Error(
      rateLimited
        ? error.message
        : 'We could not look up that order right now. Please try again shortly.',
    );
  }
  return data?.[0] ?? null;
}
