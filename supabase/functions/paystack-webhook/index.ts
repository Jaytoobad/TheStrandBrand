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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();

    // --- Verify this request genuinely came from Paystack. ---
    // Paystack signs the payload with your secret key (HMAC SHA512) and sends
    // it in the x-paystack-signature header. Reject anything that doesn't match
    // so nobody can fake a "payment succeeded" webhook.
    const signature = req.headers.get('x-paystack-signature');
    const expectedSignature = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
    if (signature !== expectedSignature) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      // Re-use the exact same verify-and-fulfil logic the redirect flow uses,
      // so there is exactly one code path that ever marks an order paid.
      const { verifyAndFulfil } = await import('../verify-payment/index.ts');
      await verifyAndFulfil(reference);
    }

    // Always 200 quickly so Paystack doesn't endlessly retry; log anything unexpected.
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    // Still return 200 — the redirect-based verify-payment call acts as a
    // fallback, and returning an error here just causes noisy retries.
    return new Response('received', { status: 200 });
  }
});

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
