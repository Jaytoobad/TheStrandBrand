// ============================================================================
// EDGE FUNCTION: verify-payment
// ============================================================================
// Called by the React order-confirmation page right after Paystack redirects
// the customer back. It does NOT trust the redirect itself — it asks Paystack
// directly "did this reference actually succeed?" and only then marks the
// order paid and adjusts stock. This is also safe to call more than once
// (idempotent): if the order is already paid, it just returns the order.
// The logic lives in ../_shared/fulfil-payment.ts so the webhook uses the same code.
//
// Deploy with:  supabase functions deploy verify-payment
// ============================================================================

import { verifyAndFulfil } from '../_shared/fulfil-payment.ts';
import { allowRequest, clientIdentifier } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-posthog-distinct-id, x-posthog-session-id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference) return json({ error: 'Missing payment reference.' }, 400);

    // Verification is idempotent, so the only abuse here is hammering the
    // endpoint with guessed references. Capped per IP and per reference.
    const rateLimited = !(await allowRequest(
      [
        { scope: 'verify_ip', max: 60, windowSeconds: 3600 },
        { scope: 'verify_reference', max: 20, windowSeconds: 3600 },
      ],
      [clientIdentifier(req), String(reference).slice(0, 100)],
    ));
    if (rateLimited) {
      return json({
        error: 'Too many verification attempts. Please wait a few minutes and try again.',
        code: 'rate_limited',
      }, 429);
    }

    const result = await verifyAndFulfil(String(reference));
    return json(result, result.error ? 400 : 200);
  } catch (err) {
    console.error(err);
    return json({ error: 'Could not verify payment right now. Please try again shortly.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
