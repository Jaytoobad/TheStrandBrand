// ============================================================================
// EDGE FUNCTION: verify-payment
// ============================================================================
// Called by the React order-confirmation page right after Paystack redirects
// the customer back. It does NOT trust the redirect itself — it asks Paystack
// directly "did this reference actually succeed?" and only then marks the
// order paid and adjusts stock. This is also safe to call more than once
// (idempotent): if the order is already paid, it just returns the order.
//
// Deploy with:  supabase functions deploy verify-payment
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference) return json({ error: 'Missing payment reference.' }, 400);

    const result = await verifyAndFulfil(reference);
    return json(result, result.error ? 400 : 200);
  } catch (err) {
    console.error(err);
    return json({ error: 'Could not verify payment right now. Please try again shortly.' }, 500);
  }
});

// Shared with the webhook function's logic (kept in sync manually since Deno
// Edge Functions don't share a local module registry across functions).
export async function verifyAndFulfil(reference: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*, orders(*)')
    .eq('reference', reference)
    .single();

  if (!payment) return { error: 'Payment reference not found.' };

  // Idempotency guard: if we've already processed this as successful, don't redo it.
  if (payment.status === 'success' && payment.orders.payment_status === 'paid') {
    return { orderNumber: payment.orders.order_number, status: payment.orders.status, alreadyProcessed: true };
  }

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data.status !== 'success') {
    await supabase.from('payments').update({ status: 'failed', paystack_raw: verifyData }).eq('reference', reference);
    await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', payment.order_id);
    return { error: 'Payment was not successful.' };
  }

  // Confirm the amount Paystack actually charged matches our trusted total
  // (defense in depth, in case a reference were ever reused/tampered with).
  const expectedAmount = Math.round(Number(payment.amount) * 100);
  if (verifyData.data.amount !== expectedAmount) {
    console.error('Amount mismatch on reference', reference);
    return { error: 'Payment amount could not be verified.' };
  }

  await supabase
    .from('payments')
    .update({ status: 'success', channel: verifyData.data.channel, paystack_raw: verifyData })
    .eq('reference', reference);

  await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'paid' })
    .eq('id', payment.order_id);

  await supabase.from('order_status_history').insert({
    order_id: payment.order_id,
    status: 'paid',
    note: 'Payment confirmed via Paystack.',
  });

  // Safely decrement stock for each line item (uses the DB function so
  // concurrent orders can't push stock negative).
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity, variant_summary')
    .eq('order_id', payment.order_id);

  for (const item of items ?? []) {
    try {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_variant_id: null, // variant_id isn't stored on order_items in this schema; extend if you split variant stock separately
        p_qty: item.quantity,
      });
    } catch (e) {
      console.error('Stock decrement issue (order still stands, review manually):', e);
    }
  }

  await supabase.from('notifications').insert({
    user_id: payment.orders.user_id,
    title: 'Payment successful',
    body: `Your order ${payment.orders.order_number} has been confirmed and is being processed.`,
  }).select(); // no-op if user_id is null (guest order) — insert will simply be skipped by RLS/constraint in that case

  return { orderNumber: payment.orders.order_number, status: 'paid' };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
