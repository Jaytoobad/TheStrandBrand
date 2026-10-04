// ============================================================================
// EDGE FUNCTION: report-error
// Writes a first-party error report from the storefront.
//
// This exists because browser error capture in PostHog sits behind the analytics
// cookie consent: a customer who declines analytics produces no error reports at
// all, so the shop owner is blind to their own storefront. Reports go to a table
// the shop owns instead, with no cookie, no persistent identifier and no IP
// address retained.
//
// The browser cannot insert into error_reports directly — an open insert grant
// on that table is a flooding target. This function holds the service role, rate
// limits and truncates the payload first.
//
// Deploy with:  supabase functions deploy report-error
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { allowRequest, clientIdentifier } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Caps. A legitimate stack trace is a few hundred characters of frame text; a
// multi-kilobyte one is either a mistake or an attempt to fill the table.
const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_URL = 300;
const MAX_CONTEXT_BYTES = 1000;

/** Truncates on a character budget that will not split a surrogate pair. */
function truncate(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cut = trimmed.slice(0, max);
  // Drop a trailing lone high surrogate so the stored text is always valid UTF-8.
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

/**
 * Builds the fingerprint: message plus the first stack frame that carries a real
 * location. Two occurrences of the same bug from different pages collapse into
 * one row; two different bugs in the same file do not, because the frame differs.
 */
function fingerprintFor(message, stack) {
  const frame = String(stack || '')
    .split('\n')
    .map((line) => line.trim())
    // The top frame is usually the throw site; anything with a URL or an at-sign
    // is more useful than a bare "Error" line.
    .find((line) => /https?:\/\/|\(.*:\d+:\d+\)/.test(line) || /\bat\s/.test(line));

  const basis = `${message}|${frame || ''}`;
  // FNV-1a, 32-bit. Not cryptographic — this only needs to be stable and cheap.
  let hash = 0x811c9dc5;
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Resolves the signed-in user id when a valid bearer token was sent. */
async function resolveUserId(req, supabase) {
  const header = req.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    // An expired or malformed token just means "report anonymously".
    return null;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const message = truncate(body?.message, MAX_MESSAGE);
  if (!message) return json({ error: 'A message is required.' }, 400);

  const stack = truncate(body?.stack, MAX_STACK);
  const fingerprint = fingerprintFor(message, stack);

  // Generous per-IP ceiling: a page with a broken component can fire repeatedly
  // and a real visitor should never be silenced. The per-fingerprint cap is the
  // one that stops a single error from filling the table.
  const rateLimited = !(await allowRequest([
    { scope: 'report_error_ip', max: 120, windowSeconds: 3600, identifier: clientIdentifier(req) },
    { scope: 'report_error_fingerprint', max: 30, windowSeconds: 3600, identifier: fingerprint },
  ]));
  if (rateLimited) return json({ error: 'Too many reports. Not recorded.' }, 429);

  // The query string can carry an email address or an order number in a shared
  // link, so only the path is kept.
  let pagePath = null;
  if (typeof body?.url === 'string') {
    try {
      pagePath = truncate(new URL(body.url, 'https://placeholder.invalid').pathname, MAX_URL);
    } catch {
      pagePath = null;
    }
  }

  let context = null;
  if (body?.context && typeof body.context === 'object') {
    try {
      const serialised = JSON.stringify(body.context);
      if (serialised.length <= MAX_CONTEXT_BYTES) context = body.context;
    } catch {
      context = null;
    }
  }

  const userId = await resolveUserId(req, supabase);

  const row = {
    fingerprint,
    message,
    stack,
    source: body?.source === 'edge' ? 'edge' : 'window',
    url: pagePath,
    user_id: userId,
    context,
  };

  // onConflict targets the unique index on fingerprint. resolved_at is cleared so
  // a bug the owner dismissed comes back as unresolved if it ever happens again.
  const { error } = await supabase
    .from('error_reports')
    .upsert(row, { onConflict: 'fingerprint' })
    .select();

  if (error) {
    // Never let reporting an error become an error of its own in the browser.
    console.error('Failed to record error report:', error);
    return json({ error: 'Could not record report.' }, 500);
  }

  return json({ ok: true });
});