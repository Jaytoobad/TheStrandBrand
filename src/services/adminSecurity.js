import { supabase } from '../lib/supabaseClient';

// Admin sign-in hardening. The counters live in Postgres rather than in the
// browser so they survive a page reload and are shared by every attempt against
// one account — see supabase/migrations/0011_admin_access_control.sql.

// Returns false once the account has failed too often in the current window.
export async function recordAdminLoginAttempt(email, succeeded, ip = null) {
  const { data, error } = await supabase.rpc('record_admin_login_attempt', {
    p_email: email,
    p_succeeded: succeeded,
    p_ip: ip,
  });
  // Never lock the owner out because the counter itself is unavailable.
  if (error) return true;
  return data !== false;
}

export async function isAdminLoginBlocked(email) {
  const { data, error } = await supabase.rpc('record_admin_login_attempt', {
    p_email: email,
    p_succeeded: true,
    p_ip: null,
  });
  if (error) return false;
  return data === false;
}

export async function clearAdminLoginAttempts(email) {
  await supabase.rpc('clear_admin_login_attempts', { p_email: email });
}
