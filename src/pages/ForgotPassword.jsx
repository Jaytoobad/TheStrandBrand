import { useState } from 'react';
import { requestPasswordReset } from '../services/auth';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container section auth-page">
      <form className="auth-form card" onSubmit={handleSubmit}>
        <h1>Reset Password</h1>
        {sent ? (
          <p>If an account exists for {email}, we've sent a password reset link.</p>
        ) : (
          <>
            <div className="form-group"><label>Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
          </>
        )}
      </form>
    </div>
  );
}
