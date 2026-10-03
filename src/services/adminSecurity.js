import { supabase } from '../lib/supabaseClient';

// Admin sign-in hardening. The counters live in Postgres rather than in the
// browser so they survive a page reload and are shared by every attempt against
// one account — see supabase/migrations/0013_harden_admin_login_and_reviews.sql.
//
// The block is checked BEFORE the password is submitted, so a visitor who is not
// signed in can be told to wait without an attempt ever being made. Failures are
// recorded only after Supabase rejects the password, and only failures: a
// client-declared success could be forged, and used to sign a correctly
// authenticated admin out of their own account.

// True when this email has failed too often in the current window. Read-only:
// it records nothing, so it is safe to call on every submit.
export async function isAdminLoginBlocked(email) {
  const { data, error } = await supabase.rpc('is_admin_login_blocked', { p_email: email });
  // Never lock the owner out because the counter itself is unavailable.
  if (error) return false;
  return data === true;
}

// Records one failed attempt and reports whether further attempts are still
// allowed. The server rate-limits how fast failures can be added, so forged
// rows cannot hold an admin locked out indefinitely.
export async function recordAdminLoginFailure(email) {
  const { data, error } = await supabase.rpc('record_admin_login_failure', { p_email: email });
  if (error) return true;
  return data !== false;
}