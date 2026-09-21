import { useState } from 'react';
import AccountLayout from './AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/auth';
import { useToast } from '../../context/ToastContext';

export default function AccountProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(user.id, form);
      await refreshProfile();
      showToast('Profile updated');
    } catch {
      showToast('Could not update profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountLayout>
      <h1>Profile</h1>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group"><label>First Name</label><input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} /></div>
          <div className="form-group"><label>Last Name</label><input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Email</label><input value={profile?.email || ''} disabled /></div>
        <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </AccountLayout>
  );
}
