// ============================================================================
// EDGE FUNCTION: paystack-webhook
// ============================================================================
// Paystack calls this URL directly (server-to-server) when a transaction's
// status changes. This is the RELIABLE source of truth for payment status —
// customers can close their browser tab before the redirect-based verify
// runs, but the webhook still fires. Both paths call the same fulfilment
// logic, and both are idempotent, so whichever arrives first "wins" safely.
//
// After deploying, register this function's URL in your Paystack dashboard:
// Settings -> API Keys & Webhooks -> Webhook URL.
//   https://<your-project-ref>.functions.supabase.co/paystack-webhook
//
// Deploy with:  supabase functions deploy paystack-webhook --no-verify-jwt
// (--no-verify-jwt because Paystack calls this anonymously; we verify the
//  request authenticity ourselves via the HMAC signature check below instead.)
// ============================================================================

import { verifyAndFulfil } from '../_shared/fulfil-payment.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();

    // --- Verify this request genuinely came from Paystack. ---
    // Paystack signs the payload with your secret key (HMAC SHA512) and sends
    // it in the x-paystack-signature header. Reject anything that doesn't match
    // so nobody can fake a "payment succeeded" webhook.
    const signature = req.headers.get('x-paystack-signature');
    const expectedSignature = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
    if (!signature || !timingSafeEqual(signature, expectedSignature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      // Same verify-and-fulfil logic the redirect flow uses (_shared/fulfil-payment.ts),
      // so there is exactly one code path that ever marks an order paid.
      const result = await verifyAndFulfil(String(reference));
      if (result.error) {
        console.warn('Webhook charge.success not fulfilled:', reference, result.error);
        // Final provider failures and amount mismatches must not be fulfilled,
        // but retryable verification/database failures should be retried by Paystack.
        if (result.error === 'Payment was not successful.' || result.error === 'Payment amount could not be verified.') {
          return new Response('ok', { status: 200 });
        }
        return new Response('Temporary payment processing failure', { status: 500 });
      }
    }

    // Acknowledge events that were processed or intentionally ignored.
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    // Non-2xx responses trigger Paystack's retry schedule for transient errors.
    return new Response('Temporary webhook processing failure', { status: 500 });
  }
});

// Compares signatures without leaking how many characters matched.
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha512Hex(key: string, message: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
