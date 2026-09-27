import posthog, { isPostHogConfigured } from '../lib/posthog';
import { isAuthApiError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

// 4xx auth errors come from user input (wrong password, unconfirmed email,
// already registered), so they are not worth reporting to error tracking.
export function isExpectedAuthError(err) {
  return isAuthApiError(err) && err.status >= 400 && err.status < 500;
}

export async function signUp({ email, password, firstName, lastName, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, phone },
      // A profiles row is created automatically by a database trigger — see
      // supabase/migrations/0001_init.sql (handle_new_user).
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  if (isPostHogConfigured) posthog.reset();
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}
