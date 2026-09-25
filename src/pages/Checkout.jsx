import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMoney, siteConfig } from '../config/siteConfig';
import usePageMeta from '../hooks/usePageMeta';
import { initializePayment } from '../services/orders';
import posthog, { isPostHogConfigured } from '../lib/posthog';

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta',
  'Northern', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
  'Western North', 'Oti', 'Savannah', 'North East',
];

export default function Checkout() {
  usePageMeta('Checkout', 'Complete your purchase and get your order delivered.');
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    email: user?.email || '',
    phone: profile?.phone || '',
    region: '',
    city: '',
    area: '',
    digitalAddress: '',
    directions: '',
  });

  if (items.length === 0) return <Navigate to="/cart" replace />;

  const deliveryFee = siteConfig.defaultDeliveryFee;
  const total = subtotal + deliveryFee;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    if (isPostHogConfigured) {
      posthog.capture('checkout_started', {
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
        order_total: total,
        currency: 'GHS',
        authenticated: Boolean(user),
      });
    }
    try {
      const payload = {
        userId: user?.id ?? null,
        customer: { name: form.name, email: form.email, phone: form.phone },
        delivery: {
          region: form.region,
          city: form.city,
          area: form.area,
          digitalAddress: form.digitalAddress,
          directions: form.directions,
          fee: deliveryFee,
        },
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      };
      const result = await initializePayment(payload);
      // Hand off to Paystack's hosted checkout. The order already exists as
      // 'pending_payment' — it becomes 'paid' only after server-side
      // verification when Paystack redirects back.
      sessionStorage.setItem('tsb_pending_order', result.orderNumber);
      clearCart();
      window.location.href = result.authorizationUrl;
    } catch (err) {
      if (isPostHogConfigured) {
        posthog.capture('checkout_start_failed', {
          item_count: items.reduce((sum, item) => sum + item.quantity, 0),
          authenticated: Boolean(user),
        });
        posthog.captureException(err);
      }
      showToast(err.message || 'Could not start checkout. Please try again.', 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="container section checkout-layout">
      <form className="checkout-form" onSubmit={handleSubmit}>
        <h1>Checkout</h1>

        <h3>Customer Information</h3>
        <div className="form-group">
          <label>Full Name</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="0XX XXX XXXX" />
          </div>
        </div>

        <h3>Delivery Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Region</label>
            <select required value={form.region} onChange={(e) => update('region', e.target.value)}>
              <option value="">Select region</option>
              {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>City / Town</label>
            <input required value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Area / Suburb</label>
          <input value={form.area} onChange={(e) => update('area', e.target.value)} />
        </div>
        <div className="form-group">
          <label>GhanaPost GPS / Digital Address (optional)</label>
          <input value={form.digitalAddress} onChange={(e) => update('digitalAddress', e.target.value)} placeholder="GA-123-4567" />
        </div>
        <div className="form-group">
          <label>Additional Delivery Instructions</label>
          <textarea rows={3} value={form.directions} onChange={(e) => update('directions', e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Starting payment…' : `Pay ${formatMoney(total)} with Paystack`}
        </button>
      </form>

      <aside className="cart-summary card">
        <h2>Order Summary</h2>
        {items.map((i) => (
          <div key={i.key} className="summary-row">
            <span>{i.name} {i.variantLabel && `(${i.variantLabel})`} × {i.quantity}</span>
            <span>{formatMoney(i.unitPrice * i.quantity)}</span>
          </div>
        ))}
        <div className="summary-row"><span>Delivery Fee</span><span>{formatMoney(deliveryFee)}</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(total)}</span></div>
      </aside>
    </div>
  );
}
