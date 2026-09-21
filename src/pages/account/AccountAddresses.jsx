import { useEffect, useState } from 'react';
import AccountLayout from './AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchAddresses, saveAddress, deleteAddress } from '../../services/addresses';
import { useToast } from '../../context/ToastContext';

const emptyAddress = { full_name: '', phone: '', region: '', city: '', area: '', digital_address: '', directions: '', is_default: false };

export default function AccountAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  function load() {
    fetchAddresses(user.id).then(setAddresses).finally(() => setLoading(false));
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      await saveAddress(user.id, editing);
      showToast('Address saved');
      setEditing(null);
      load();
    } catch {
      showToast('Could not save address.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this address?')) return;
    await deleteAddress(id);
    load();
  }

  return (
    <AccountLayout>
      <div className="section-header">
        <h1>Saved Addresses</h1>
        <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...emptyAddress })}>+ Add Address</button>
      </div>

      {loading ? null : addresses.length === 0 && !editing ? (
        <p className="empty-state">No saved addresses yet.</p>
      ) : (
        <div className="address-list">
          {addresses.map((a) => (
            <div key={a.id} className="card address-card">
              <div>
                <strong>{a.full_name}</strong> {a.is_default && <span className="badge badge-new">Default</span>}
                <p>{a.phone}</p>
                <p>{a.area ? `${a.area}, ` : ''}{a.city}, {a.region}</p>
                {a.digital_address && <p>{a.digital_address}</p>}
              </div>
              <div className="address-actions">
                <button className="btn btn-sm btn-outline" onClick={() => setEditing(a)}>Edit</button>
                <button className="btn btn-sm btn-outline" onClick={() => handleDelete(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <form className="profile-form address-form" onSubmit={handleSave}>
          <h3>{editing.id ? 'Edit Address' : 'New Address'}</h3>
          <div className="form-row">
            <div className="form-group"><label>Full Name</label><input required value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
            <div className="form-group"><label>Phone</label><input required value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Region</label><input required value={editing.region} onChange={(e) => setEditing({ ...editing, region: e.target.value })} /></div>
            <div className="form-group"><label>City</label><input required value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Area</label><input value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></div>
          <div className="form-group"><label>Digital Address</label><input value={editing.digital_address} onChange={(e) => setEditing({ ...editing, digital_address: e.target.value })} /></div>
          <div className="form-group"><label>Directions</label><textarea rows={2} value={editing.directions} onChange={(e) => setEditing({ ...editing, directions: e.target.value })} /></div>
          <label className="checkbox-row">
            <input type="checkbox" checked={editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} /> Set as default address
          </label>
          <div className="address-form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Address</button>
          </div>
        </form>
      )}
    </AccountLayout>
  );
}
