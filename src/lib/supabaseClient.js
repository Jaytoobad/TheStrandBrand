import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fails loudly in dev rather than silently breaking every data call.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill them in.'
  );
}

let client = null;
let clearingSession = null;

function isRejectedLogin(body) {
  return Boolean(body) && (body.code === 'PGRST301' || body.code === 'PGRST303' || /jwt/i.test(body.message || ''));
}

// If a saved login is no longer valid (keys rotated, corrupted storage), every
// request would fail with 401 and the whole shop would look broken. Instead we
// drop the bad login once and retry the request as a signed-out visitor.
async function resilientFetch(input, init = {}) {
  const res = await fetch(input, init);
  if (res.status !== 401 || !client) return res;

  const url = typeof input === 'string' ? input : input.url;
  if (!url.includes('/rest/v1/') && !url.includes('/storage/v1/')) return res;

  const headers = new Headers(init.headers);
  const auth = headers.get('Authorization');
  if (!auth || auth === `Bearer ${supabaseKey}`) return res;
  if (!isRejectedLogin(await res.clone().json().catch(() => null))) return res;

  clearingSession ??= client.auth.signOut({ scope: 'local' }).catch(() => {}).finally(() => { clearingSession = null; });
  await clearingSession;

  headers.set('Authorization', `Bearer ${supabaseKey}`);
  return fetch(input, { ...init, headers });
}

client = createClient(supabaseUrl, supabaseKey, { global: { fetch: resilientFetch } });

export const supabase = client;
