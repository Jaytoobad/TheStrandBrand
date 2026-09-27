import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../services/auth';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import { friendlyAuthError } from './Login';
import posthog, { isPostHogConfigured } from '../lib/posthog';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GHANA_PHONE_PATTERN = /^0\d{9}$/;

export default function Register() {
  usePageMeta('Create Account', 'Register for a TheStrandBrand account to track orders and save your details.');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) {
      next.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    const cleanedPhone = form.phone.replace(/\s+/g, '');
    if (!cleanedPhone) {
      next.phone = 'Phone number is required.';
    } else if (!GHANA_PHONE_PATTERN.test(cleanedPhone)) {
      next.phone = 'Enter a valid 10-digit number starting with 0 (e.g. 024 123 4567).';
    }
    if (!form.password) {
      next.password = 'Password is required.';
    } else if (form.password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (!form.confirm) {
      next.confirm = 'Please confirm your password.';
    } else if (form.password !== form.confirm) {
      next.confirm = 'Passwords do not match.';
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
      const { user } = await signUp(form);
      if (user && isPostHogConfigured) {
        posthog.identify(user.id, {
          email: user.email,
          name: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone,
        });
        posthog.capture('account_registered', { method: 'password' });
      }
      setVerifySent(true);
    } catch (err) {
      if (isPostHogConfigured) posthog.captureException(err);
      showToast(friendlyAuthError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  if (verifySent) {
    return (
      <div className="container section empty-state">
        <h1>Check your email</h1>
        <p>We've sent a verification link to <strong>{form.email}</strong>. Please verify your email before logging in.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="container section auth-page">
      <form className="auth-form card" onSubmit={handleSubmit} noValidate>
        <h1>Create Account</h1>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reg-first-name">First Name</label>
            <input
              id="reg-first-name"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? 'reg-first-name-error' : undefined}
            />
            {errors.firstName && <p id="reg-first-name-error" className="form-error" role="alert">{errors.firstName}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-last-name">Last Name</label>
            <input
              id="reg-last-name"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? 'reg-last-name-error' : undefined}
            />
            {errors.lastName && <p id="reg-last-name-error" className="form-error" role="alert">{errors.lastName}</p>}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'reg-email-error' : undefined}
          />
          {errors.email && <p id="reg-email-error" className="form-error" role="alert">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="reg-phone">Phone</label>
          <input
            id="reg-phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="0XX XXX XXXX"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'reg-phone-error' : undefined}
          />
          {errors.phone && <p id="reg-phone-error" className="form-error" role="alert">{errors.phone}</p>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'reg-password-error' : undefined}
            />
            {errors.password && <p id="reg-password-error" className="form-error" role="alert">{errors.password}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? 'reg-confirm-error' : undefined}
            />
            {errors.confirm && <p id="reg-confirm-error" className="form-error" role="alert">{errors.confirm}</p>}
          </div>
        </div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
        <div className="auth-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </form>
    </div>
  );
}