// ============================================================================
// Shared payment fulfilment, used by verify-payment (browser redirect) and
// paystack-webhook (server-to-server). Both call verifyAndFulfil(), which asks
// Paystack directly whether a reference succeeded, then marks the order paid,
// adjusts stock and sends notifications exactly once (idempotent).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { captureServerEvent } from './posthog.ts';
import { sendOrderNotifications } from './order-notifications.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Every failure path below sets `retryable`, which is how callers decide whether
// to hand the event back to Paystack or stop. It used to be inferred by matching
// the human-readable `error` string, which meant a reworded message silently
// turned a permanent failure into an endless retry loop — and left
// 'Payment reference not found.' out of the permanent list entirely, so an
// unresolvable reference was retried forever. Callers must branch on this flag,
// never on the text.
//
//   retryable: true  — transient; Paystack should redeliver the event.
//   retryable: false — final; retrying cannot change the outcome.
export type FulfilFailure = { error: string; retryable: boolean; orderId?: string | null };
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function verifyAndFulfil(reference: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*, orders(*)')
    .eq('reference', reference)
    .single();

  if (!payment) return { error: 'Payment reference not found.', retryable: false, orderId: null };

  // Idempotency guard: if we've already processed this as successful, don't redo it.
  if (payment.status === 'success' && payment.orders.payment_status === 'paid') {
    return { orderId: payment.order_id, orderNumber: payment.orders.order_number, status: payment.orders.status, alreadyProcessed: true };
  }

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const verifyData = await verifyRes.json();
  const posthogDistinctId = verifyData.data?.metadata?.posthog_distinct_id ?? null;
  const posthogSessionId = verifyData.data?.metadata?.posthog_session_id;
  const sessionProperties = posthogSessionId ? { $session_id: posthogSessionId } : {};

  if (!verifyData.status || verifyData.data?.status !== 'success') {
    // Only mark failed when Paystack gave a final answer. "ongoing"/"pending"
    // (e.g. Mobile Money waiting for approval) must stay pending so the
    // webhook can still confirm it a moment later.
    const finalFailure = ['failed', 'abandoned', 'reversed'].includes(verifyData.data?.status);
    if (finalFailure) {
      await supabase.from('payments').update({ status: 'failed', paystack_raw: verifyData }).eq('reference', reference);
      await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', payment.order_id).neq('payment_status', 'paid');
    }
    if (posthogDistinctId) {
      await captureServerEvent(posthogDistinctId, 'payment_failed', {
        order_id: payment.order_id,
        order_total: Number(payment.amount),
        currency: payment.currency,
        failure_reason: finalFailure ? 'provider_status' : 'not_completed_yet',
        ...sessionProperties,
      });
    }
    return {
      error: finalFailure
        ? 'Payment was not successful.'
        : 'Your payment is still being processed. If you approved it, your order will update in a few minutes.',
      // A final provider answer is permanent. Anything else is an approval we
      // are still waiting on (Mobile Money), so the webhook must come back.
      retryable: !finalFailure,
      orderId: payment.order_id,
    };
  }

  // Confirm the amount Paystack actually charged matches our trusted total
  // (defense in depth, in case a reference were ever reused/tampered with).
  const expectedAmount = Math.round(Number(payment.amount) * 100);
  if (verifyData.data.amount !== expectedAmount) {
    console.error('Amount mismatch on reference', reference);
    if (posthogDistinctId) {
      await captureServerEvent(posthogDistinctId, 'payment_failed', {
        order_id: payment.order_id,
        order_total: Number(payment.amount),
        currency: payment.currency,
        failure_reason: 'amount_mismatch',
        ...sessionProperties,
      });
    }
    return { error: 'Payment amount could not be verified.', retryable: false, orderId: payment.order_id };
  }

  await supabase
    .from('payments')
    .update({ status: 'success', channel: verifyData.data.channel, paystack_raw: verifyData })
    .eq('reference', reference);

  const { data: paidOrder, error: orderUpdateError } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'paid' })
    .eq('id', payment.order_id)
    .neq('payment_status', 'paid')
    .select()
    .maybeSingle();

  if (orderUpdateError) throw orderUpdateError;
  if (!paidOrder) {
    return { orderId: payment.order_id, orderNumber: payment.orders.order_number, status: 'paid', alreadyProcessed: true };
  }

  await supabase.from('order_status_history').insert({
    order_id: payment.order_id,
    status: 'paid',
    note: 'Payment confirmed via Paystack.',
  });

  // Safely decrement stock for each line item (uses the DB function so
  // concurrent orders can't push stock negative).
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, variant_id, product_name, variant_summary, quantity, subtotal, products(allow_preorder)')
    .eq('order_id', payment.order_id);

  for (const item of items ?? []) {
    if (item.products?.allow_preorder || !item.product_id) continue;
    try {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
      });
    } catch (e) {
      console.error('Stock decrement issue (order still stands, review manually):', e);
    }
  }

  await sendOrderNotifications(paidOrder, items ?? []);

  // Guests have no account, so only signed-in customers get an in-app notification.
  if (payment.orders.user_id) {
    await supabase.from('notifications').insert({
      user_id: payment.orders.user_id,
      title: 'Payment successful',
      body: `Your order ${payment.orders.order_number} has been confirmed and is being processed.`,
    });
  }

  if (posthogDistinctId) {
    await captureServerEvent(posthogDistinctId, 'payment_succeeded', {
      order_id: payment.order_id,
      order_total: Number(payment.amount),
      item_count: (items ?? []).reduce((sum, item) => sum + item.quantity, 0),
      currency: payment.currency,
      payment_channel: verifyData.data.channel,
      ...sessionProperties,
    });
  }

  return { orderId: payment.order_id, orderNumber: payment.orders.order_number, status: 'paid' };
}
