// ============================================================================
// EDGE FUNCTION SHARED: rate limiting
// ============================================================================
// Guest checkout (initialize-payment) and payment verification (verify-payment)
// are public, unauthenticated endpoints, so anyone could call them in a loop.
// Each call creates database rows and a Paystack transaction, so we cap how
// often a single caller may do that.
//
// The counters live in Postgres (supabase/migrations/0008_rate_limiting.sql)
// rather than in memory, because Edge Function instances are not shared and a
// per-instance counter can be reset simply by making more calls.
//
// Ghanaian mobile networks put many customers behind one public IP (CGNAT),
// so IP limits here are deliberately generous. The tighter limits are keyed on
// something an attacker cannot trivially rotate, such as the customer email.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// The customer's address as seen by Supabase. x-forwarded-for can be a list,
// so the first entry is the real client.
export function clientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

type Limit = {
  scope: string;
  max: number;
  windowSeconds: number;
};

/**
 * Spends one rate-limit token for each identifier and reports whether the call
 * is allowed. Identifiers are plain strings (an IP address, or an email for
 * per-customer limits). When the check fails, the reason is logged and the
 * function returns false rather than throwing, so callers decide the response.
 */
export async function allowRequest(limits: Limit[], identifiers: string[]): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  for (const limit of limits) {
    for (const identifier of identifiers) {
      const { data, error } = await supabase.rpc('consume_rate_limit', {
        p_scope: limit.scope,
        p_limit: limit.max,
        p_window_seconds: limit.windowSeconds,
        p_identifier: identifier,
      });

      if (error) {
        // Never block a real customer because the limiter itself is broken.
        console.error('Rate limit check failed:', error);
        continue;
      }

      if (!data) {
        console.warn(`Rate limit reached for scope "${limit.scope}".`);
        return false;
      }
    }
  }

  return true;
}