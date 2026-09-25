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
  if (!res.ok) throw new Error(data.error || 'Could not start payment.');
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
  return data;
}

// Public order tracking: calls the track_order() database function, which
// requires BOTH the order number and a matching email/phone before it
// returns anything — see supabase/migrations/0001_init.sql. This means a
// stranger who only guesses an order number learns nothing.
export async function trackOrder({ orderNumber, contact }) {
  const { data, error } = await supabase.rpc('track_order', {
    p_order_number: orderNumber.trim(),
    p_contact: contact.trim(),
  });
  if (error) throw error;
  return data?.[0] ?? null;
}
