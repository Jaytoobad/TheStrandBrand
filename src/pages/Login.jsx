import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../services/auth';
import { useToast } from '../context/ToastContext';
 import usePageMeta from '../hooks/usePageMeta';
import posthog, { isPostHogConfigured } from '../lib/posthog';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  usePageMeta('Login', 'Log in to your TheStrandBrand account.');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  function validate() {
    const next = {};
    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!password) {
      next.password = 'Password is required.';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
      return;
    }
    setErrors({});
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
      <form className="auth-form card" onSubmit={handleSubmit} noValidate>
        <h1>Welcome Back</h1>
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
          {errors.email && <p id="login-email-error" className="form-error" role="alert">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
          />
          {errors.password && <p id="login-password-error" className="form-error" role="alert">{errors.password}</p>}
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