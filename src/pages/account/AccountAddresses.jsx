import { useEffect, useState } from 'react';
import AccountLayout from './AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchAddresses, saveAddress, deleteAddress } from '../../services/addresses';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const emptyAddress = { full_name: '', phone: '', region: '', city: '', area: '', digital_address: '', directions: '', is_default: false };
const GHANA_PHONE_PATTERN = /^0\d{9}$/;
const DIGITAL_ADDRESS_PATTERN = /^[A-Za-z]{2}-\d{3,4}-\d{3,4}$/;

export default function AccountAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const { showToast } = useToast();

  function load() {
    fetchAddresses(user.id).then(setAddresses).finally(() => setLoading(false));
  }

  useEffect(() => { if (user) load(); }, [user]);

  function updateField(field, value) {
    setEditing((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(address) {
    const next = {};
    if (!address.full_name.trim()) next.full_name = 'Full name is required.';
    const cleanedPhone = address.phone.replace(/\s+/g, '');
    if (!cleanedPhone) {
      next.phone = 'Phone number is required.';
    } else if (!GHANA_PHONE_PATTERN.test(cleanedPhone)) {
      next.phone = 'Enter a valid 10-digit number starting with 0 (e.g. 024 123 4567).';
    }
    if (!address.region.trim()) next.region = 'Region is required.';
    if (!address.city.trim()) next.city = 'City is required.';
    if (address.digital_address.trim() && !DIGITAL_ADDRESS_PATTERN.test(address.digital_address.trim())) {
      next.digital_address = 'Format should look like GA-183-9297.';
    }
    return next;
  }

  async function handleSave(e) {
    e.preventDefault();
    const validationErrors = validate(editing);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
      return;
    }
    try {
      await saveAddress(user.id, editing);
      showToast('Address saved');
      setEditing(null);
      setErrors({});
      load();
    } catch {
      showToast('Could not save address.', 'error');
    }
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await deleteAddress(id);
    showToast('Address deleted');
    load();
  }

  function startEditing(address) {
    setErrors({});
    setEditing(address);
  }

  return (
    <AccountLayout>
      <div className="section-header">
        <h1>Saved Addresses</h1>
        <button className="btn btn-outline btn-sm" onClick={() => startEditing({ ...emptyAddress })}>+ Add Address</button>
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
                <button className="btn btn-sm btn-outline" onClick={() => startEditing(a)}>Edit</button>
                <button className="btn btn-sm btn-outline" onClick={() => setPendingDeleteId(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <form className="profile-form address-form" onSubmit={handleSave} noValidate>
          <h3>{editing.id ? 'Edit Address' : 'New Address'}</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addr-full-name">Full Name</label>
              <input
                id="addr-full-name"
                value={editing.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                aria-invalid={Boolean(errors.full_name)}
                aria-describedby={errors.full_name ? 'addr-full-name-error' : undefined}
              />
              {errors.full_name && <p id="addr-full-name-error" className="form-error" role="alert">{errors.full_name}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="addr-phone">Phone</label>
              <input
                id="addr-phone"
                value={editing.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="0XX XXX XXXX"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'addr-phone-error' : undefined}
              />
              {errors.phone && <p id="addr-phone-error" className="form-error" role="alert">{errors.phone}</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addr-region">Region</label>
              <input
                id="addr-region"
                value={editing.region}
                onChange={(e) => updateField('region', e.target.value)}
                aria-invalid={Boolean(errors.region)}
                aria-describedby={errors.region ? 'addr-region-error' : undefined}
              />
              {errors.region && <p id="addr-region-error" className="form-error" role="alert">{errors.region}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="addr-city">City</label>
              <input
                id="addr-city"
                value={editing.city}
                onChange={(e) => updateField('city', e.target.value)}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? 'addr-city-error' : undefined}
              />
              {errors.city && <p id="addr-city-error" className="form-error" role="alert">{errors.city}</p>}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="addr-area">Area</label>
            <input id="addr-area" value={editing.area} onChange={(e) => updateField('area', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="addr-digital">Digital Address</label>
            <input
              id="addr-digital"
              value={editing.digital_address}
              onChange={(e) => updateField('digital_address', e.target.value)}
              placeholder="GA-123-4567"
              aria-invalid={Boolean(errors.digital_address)}
              aria-describedby={errors.digital_address ? 'addr-digital-error' : undefined}
            />
            {errors.digital_address && <p id="addr-digital-error" className="form-error" role="alert">{errors.digital_address}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="addr-directions">Directions</label>
            <textarea id="addr-directions" rows={2} value={editing.directions} onChange={(e) => updateField('directions', e.target.value)} />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={editing.is_default} onChange={(e) => updateField('is_default', e.target.checked)} /> Set as default address
          </label>
          <div className="address-form-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setEditing(null); setErrors({}); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Address</button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this address?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </AccountLayout>
  );
}