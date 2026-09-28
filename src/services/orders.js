import { FunctionsHttpError } from '@supabase/supabase-js';
import { getPostHogHeaders } from '../lib/posthog';
import { supabase } from '../lib/supabaseClient';

// These two calls hit the secure Edge Functions rather than writing to the
// `orders`/`payments` tables directly — pricing, stock checks and payment
// verification all happen server-side. See supabase/functions/.
// functions.invoke adds the `apikey` header (and the user's JWT when signed
// in) that the Supabase gateway needs before it forwards the request.

async function invokeFunction(name, body, fallbackMessage) {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: getPostHogHeaders(),
  });
  if (!error) return data;

  if (error instanceof FunctionsHttpError) {
    const details = await error.context.json().catch(() => null);
    throw new Error(details?.error || fallbackMessage, { cause: error });
  }
  // Network or relay failure: the request never reached our function.
  throw new Error(
    'We could not reach our payment service. Check your connection and try again.',
    { cause: error }
  );
}

export function initializePayment(payload) {
  return invokeFunction('initialize-payment', payload, 'Could not start payment.');
}

export function verifyPayment(reference) {
  return invokeFunction('verify-payment', { reference }, 'Could not verify payment.');
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
