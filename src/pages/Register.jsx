import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../services/auth';
import { useToast } from '../context/ToastContext';
import { friendlyAuthError } from './Login';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { showToast('Passwords do not match.', 'error'); return; }
    if (form.password.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    setLoading(true);
    try {
      await signUp(form);
      setVerifySent(true);
    } catch (err) {
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
      <form className="auth-form card" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <div className="form-row">
          <div className="form-group"><label>First Name</label><input required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></div>
          <div className="form-group"><label>Last Name</label><input required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></div>
        </div>
        <div className="form-group"><label>Email</label><input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
        <div className="form-group"><label>Phone</label><input required value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
        <div className="form-row">
          <div className="form-group"><label>Password</label><input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)} /></div>
          <div className="form-group"><label>Confirm Password</label><input required type="password" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} /></div>
        </div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
        <div className="auth-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </form>
    </div>
  );
}
