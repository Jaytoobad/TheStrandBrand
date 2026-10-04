import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, signOut } from '../../services/auth';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';
import { friendlyAuthError } from '../../pages/Login';
import PasswordInput from '../../components/PasswordInput';
import { recordAdminLoginFailure, isAdminLoginBlocked } from '../../services/adminSecurity';

// Admin login uses the exact same Supabase Auth as customers — there is no
// separate/hardcoded admin credential. What makes someone an admin is their row
// in the `admin_accounts` access list, enforced server-side by RLS, so nothing
// on this page decides who is an administrator.
//
// Repeated failures are counted per email address (not just per IP, which a
// whole neighbourhood can share) and the form refuses further attempts until the
// window passes. Successful logins are written to an audit trail.
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    // Browser-saved passwords can fill the fields without telling React, so
    // read what's actually in the form.
    const form = new FormData(e.currentTarget);
    const emailValue = String(form.get('email') || email).trim();
    const passwordValue = String(form.get('password') || password);
    if (!emailValue || !passwordValue) { setError('Enter your email and password.'); return; }

    // Cheap local check first so a script looping this form is slowed even
    // before it reaches the server.
    const wait = blockedUntil ? blockedUntil - Date.now() : 0;
    if (wait > 0) {
      setError(`Too many failed attempts. Try again in ${Math.ceil(wait / 1000)} seconds.`);
      return;
    }

    setError('');
    setLoading(true);

    // Ask the server whether this email is throttled *before* submitting the
    // password. Relying on `blockedUntil` alone meant a page reload cleared the
    // block and every reload still made a real attempt against the account.
    try {
      if (await isAdminLoginBlocked(emailValue)) {
        setBlockedUntil(Date.now() + 15 * 60 * 1000);
        setError('Too many failed attempts. Try again in 15 minutes.');
        setLoading(false);
        return;
      }
    } catch {
      // Counter unavailable — fall through and let Supabase decide.
    }

    // Only a rejected password counts towards the throttle. Everything that can go
// wrong after Supabase has accepted the password is a different problem, and
// counting those as failed sign-ins locked a real admin out of their own
// account while the password was correct.
    let user;
    try {
      ({ user } = await signIn({ email: emailValue, password: passwordValue }));
    } catch (err) {
      console.error('Admin sign-in rejected:', err?.code, err?.status, err?.message);
      const stillAllowed = await recordAdminLoginFailure(emailValue).catch(() => true);
      if (!stillAllowed) {
        setBlockedUntil(Date.now() + 15 * 60 * 1000);
        setError('Too many failed attempts. Try again in 15 minutes.');
        showToast('Too many failed attempts. This account is paused for 15 minutes.', 'error');
      } else {
        const message = friendlyAuthError(err);
        setError(message);
        showToast(message, 'error');
      }
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') {
        await signOut().catch(() => {});
        setError('This account does not have admin access. Sign in with the account that was granted admin, or ask an administrator to grant it.');
        showToast('This account does not have admin access.', 'error');
        setLoading(false);
        return;
      }
      // Only genuine admins reach here, so this cannot forge audit rows.
      // supabase.rpc() returns a thenable builder, not a Promise, so it has no
      // .catch() — calling one threw a TypeError and aborted the login after the
      // credentials and the admin check had both already passed. Auditing must
      // never be able to block a real admin from signing in.
      try {
        await supabase.rpc('record_admin_signin');
      } catch {
        // Audit write failed; carry on into the admin area.
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      // The password was accepted. Show the underlying reason instead of a
      // generic failure, because "something went wrong" here hides whether the
      // problem is the profile lookup, the network, or the session.
      console.error('Admin sign-in succeeded but the admin check failed:', err);
      await signOut().catch(() => {});
      const detail = String(err?.message || err || '').trim();
      setError(`Signed in, but the admin check failed: ${detail || 'unknown error'}. Check the browser console and Supabase Auth logs.`);
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <form className="auth-form card" onSubmit={handleSubmit} noValidate>
        <h1>Admin Login</h1>
        <div className="form-group">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="admin-password">Password</label>
          <PasswordInput id="admin-password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
        <p className="admin-login-reset">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="admin-login-note">Admin sign-ins are recorded for security. Enable two-factor authentication on your Supabase account.</p>
      </form>
    </div>
  );
}
