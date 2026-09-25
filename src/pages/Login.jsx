import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../services/auth';
import { useToast } from '../context/ToastContext';
 import usePageMeta from '../hooks/usePageMeta';
import posthog, { isPostHogConfigured } from '../lib/posthog';

export default function Login() {
  usePageMeta('Login', 'Log in to your TheStrandBrand account.');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await signIn({ email, password });
      if (isPostHogConfigured) {
        posthog.identify(user.id, { email: user.email });
        posthog.capture('user_logged_in', { method: 'password' });
      }
      navigate(location.state?.from?.pathname || '/account');
    } catch (err) {
      if (isPostHogConfigured) posthog.captureException(err);
      showToast(friendlyAuthError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container section auth-page">
      <form className="auth-form card" onSubmit={handleSubmit}>
        <h1>Welcome Back</h1>
        <div className="form-group">
          <label>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create an account</Link>
        </div>
      </form>
    </div>
  );
}

export function friendlyAuthError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('Email not confirmed')) return 'Please verify your email before logging in.';
  if (msg.includes('already registered')) return 'An account with this email already exists.';
  return 'Something went wrong. Please try again.';
}
