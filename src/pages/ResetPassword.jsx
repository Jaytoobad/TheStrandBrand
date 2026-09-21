import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../services/auth';
import { useToast } from '../context/ToastContext';

// Supabase Auth redirects here (with a recovery session already active)
// after the user clicks the emailed reset link.
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { showToast('Passwords do not match.', 'error'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      showToast('Password updated. Please log in.');
      navigate('/login');
    } catch {
      showToast('Could not update password. The link may have expired.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container section auth-page">
      <form className="auth-form card" onSubmit={handleSubmit}>
        <h1>Set New Password</h1>
        <div className="form-group"><label>New Password</label><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="form-group"><label>Confirm Password</label><input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Updating…' : 'Update Password'}</button>
      </form>
    </div>
  );
}
