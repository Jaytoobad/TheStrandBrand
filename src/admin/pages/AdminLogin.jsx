import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signOut } from '../../services/auth';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';
import { friendlyAuthError } from '../../pages/Login';
import PasswordInput from '../../components/PasswordInput';

// Admin login uses the exact same Supabase Auth as customers — there is no
// separate/hardcoded admin credential. What makes someone an admin is the
// `role = 'admin'` column on their `profiles` row (set manually — see the
// README's "How to create the first admin" section), and RLS enforces it
// server-side regardless of what this page does.
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

    setError('');
    setLoading(true);
    try {
      const { user } = await signIn({ email: emailValue, password: passwordValue });
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profileError) {
        setError('Signed in, but your account details could not be loaded. Please try again.');
        return;
      }
      if (profile?.role !== 'admin') {
        await signOut().catch(() => {});
        setError('This account does not have admin access.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      const message = friendlyAuthError(err);
      setError(message);
      showToast(message, 'error');
    } finally {
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
      </form>
    </div>
  );
}
