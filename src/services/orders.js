import { getPostHogHeaders } from '../lib/posthog';
import { supabase } from '../lib/supabaseClient';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// These two calls hit the secure Edge Functions rather than writing to the
// `orders`/`payments` tables directly — pricing, stock checks and payment
// verification all happen server-side. See supabase/functions/.

// A gateway or proxy error comes back as an HTML error page, not JSON, so
// parsing it directly would throw an opaque "Unexpected token '<'" and hide the
// real problem from both the customer and our logs.
async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function initializePayment(payload) {
  // The Edge Function decides whether an order belongs to an account, so send
  // the session token. It verifies this server-side instead of trusting any id
  // in the request body.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const res = await fetch(`${FUNCTIONS_BASE}/initialize-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPostHogHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data?.error || `Could not start payment (error ${res.status}). Please try again.`);
    err.code = data?.code; // e.g. 'delivery_fee_changed', 'rate_limited'
    throw err;
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Could not start payment. Please try again.');
  }
  return data;
}

export async function verifyPayment(reference) {
  const res = await fetch(`${FUNCTIONS_BASE}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPostHogHeaders() },
    body: JSON.stringify({ reference }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.error || 'Could not verify payment.');
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
