import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../../services/auth';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';

// Admin login uses the exact same Supabase Auth as customers — there is no
// separate/hardcoded admin credential. What makes someone an admin is the
// `role = 'admin'` column on their `profiles` row (set manually — see the
// README's "How to create the first admin" section), and RLS enforces it
// server-side regardless of what this page does.
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await signIn({ email, password });
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        showToast('This account does not have admin access.', 'error');
        return;
      }
      navigate('/admin');
    } catch {
      showToast('Incorrect email or password.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <form className="auth-form card" onSubmit={handleSubmit}>
        <h1>Admin Login</h1>
        <div className="form-group"><label>Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="form-group"><label>Password</label><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
      </form>
    </div>
  );
}
