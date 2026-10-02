import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../config/siteConfig';
import usePageMeta from '../hooks/usePageMeta';
import { initializePayment } from '../services/orders';
import posthog, { canCapturePostHog } from '../lib/posthog';
import DeliveryEstimate from '../components/DeliveryEstimate';
import useDeliveryRates from '../hooks/useDeliveryRates';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GHANA_PHONE_PATTERN = /^0\d{9}$/;
const DIGITAL_ADDRESS_PATTERN = /^[A-Za-z]{2}-\d{3,4}-\d{3,4}$/;

export default function Checkout() {
  usePageMeta('Checkout', 'Complete your purchase and get your order delivered.');
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { rates, feeByRegion, refresh: refreshRates } = useDeliveryRates();
  const [submitting, setSubmitting] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [errors, setErrors] = useState({});
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

  // null until the customer picks a region
  const deliveryFee = form.region ? feeByRegion[form.region] ?? null : null;
  const total = subtotal + (deliveryFee ?? 0);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate() {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = 'Please enter your full name.';
    }
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
    if (!form.region) {
      next.region = 'Please select a region.';
    } else if (deliveryFee == null) {
      next.region = 'We could not find a delivery fee for this region. Please message us on WhatsApp.';
    }
    if (!form.city.trim()) {
      next.city = 'City / Town is required.';
    }
    if (!policyAccepted) {
      next.policyAccepted = 'Please confirm that you have read the Refund & Return Policy.';
    }
    if (form.digitalAddress.trim() && !DIGITAL_ADDRESS_PATTERN.test(form.digitalAddress.trim())) {
      next.digitalAddress = 'Format should look like GA-183-9297.';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast('Please fix the highlighted fields.', 'error');
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
      return;
    }
    setErrors({});

    setSubmitting(true);
    if (canCapturePostHog()) {
      posthog.capture('checkout_started', {
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
        order_total: total,
        currency: 'GHS',
        authenticated: Boolean(user),
      });
    }
    try {
      const payload = {
        policyAccepted,
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
      // Lets guests land on their tracked order after payment without retyping their email.
      sessionStorage.setItem('tsb_pending_contact', form.email.trim());
      clearCart();
      window.location.href = result.authorizationUrl;
    } catch (err) {
      if (canCapturePostHog()) {
        posthog.capture('checkout_start_failed', {
          item_count: items.reduce((sum, item) => sum + item.quantity, 0),
          authenticated: Boolean(user),
        });
        posthog.captureException(err);
      }
      if (err.code === 'delivery_fee_changed') refreshRates();
      showToast(err.message || 'Could not start checkout. Please try again.', 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="container section checkout-layout">
      <form className="checkout-form" onSubmit={handleSubmit} noValidate>
        <h1>Checkout</h1>

        <h3>Customer Information</h3>
        <div className="form-group">
          <label htmlFor="checkout-name">Full Name</label>
          <input
            id="checkout-name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'checkout-name-error' : undefined}
          />
          {errors.name && <p id="checkout-name-error" className="form-error" role="alert">{errors.name}</p>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="checkout-email">Email</label>
            <input
              id="checkout-email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'checkout-email-error' : undefined}
            />
            {errors.email && <p id="checkout-email-error" className="form-error" role="alert">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="checkout-phone">Phone</label>
            <input
              id="checkout-phone"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="0XX XXX XXXX"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
            />
            <p className="form-hint">We will email your order confirmation and send order updates by SMS to these details.</p>
            {errors.phone && <p id="checkout-phone-error" className="form-error" role="alert">{errors.phone}</p>}
          </div>
        </div>

        <h3>Delivery Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="checkout-region">Region</label>
            <select
              id="checkout-region"
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              aria-invalid={Boolean(errors.region)}
              aria-describedby={errors.region ? 'checkout-region-error' : undefined}
            >
              <option value="">Select region</option>
              {rates.map((r) => <option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
            {deliveryFee != null && <p className="form-hint">Delivery to {form.region}: {formatMoney(deliveryFee)}</p>}
            {errors.region && <p id="checkout-region-error" className="form-error" role="alert">{errors.region}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="checkout-city">City / Town</label>
            <input
              id="checkout-city"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'checkout-city-error' : undefined}
            />
            {errors.city && <p id="checkout-city-error" className="form-error" role="alert">{errors.city}</p>}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="checkout-area">Area / Suburb</label>
          <input id="checkout-area" value={form.area} onChange={(e) => update('area', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="checkout-digital-address">GhanaPost GPS / Digital Address (optional)</label>
          <input
            id="checkout-digital-address"
            value={form.digitalAddress}
            onChange={(e) => update('digitalAddress', e.target.value)}
            placeholder="GA-123-4567"
            aria-invalid={Boolean(errors.digitalAddress)}
            aria-describedby={errors.digitalAddress ? 'checkout-digital-address-error' : undefined}
          />
          {errors.digitalAddress && <p id="checkout-digital-address-error" className="form-error" role="alert">{errors.digitalAddress}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="checkout-directions">Additional Delivery Instructions</label>
          <textarea id="checkout-directions" rows={3} value={form.directions} onChange={(e) => update('directions', e.target.value)} />
        </div>

        <div className="form-group">
          <div className="checkout-policy-acknowledgement">
            <input id="checkout-policy-accepted" type="checkbox" checked={policyAccepted} onChange={(e) => { setPolicyAccepted(e.target.checked); if (e.target.checked && errors.policyAccepted) setErrors((previous) => ({ ...previous, policyAccepted: undefined })); }} aria-invalid={Boolean(errors.policyAccepted)} aria-describedby={errors.policyAccepted ? 'checkout-policy-error' : undefined} />
            <p><label htmlFor="checkout-policy-accepted">I have read and agree to the </label><Link to="/refund-policy" target="_blank">Refund &amp; Return Policy</Link>.</p>
          </div>
          {errors.policyAccepted && <p id="checkout-policy-error" className="form-error" role="alert">{errors.policyAccepted}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Starting payment…' : deliveryFee != null ? `Pay ${formatMoney(total)} with Paystack` : 'Pay with Paystack'}
        </button>
      </form>

      <aside className="cart-summary card">
        <h2>Order Summary</h2>
        <DeliveryEstimate compact />
        {items.map((i) => (
          <div key={i.key} className="summary-row">
            <span>{i.name} {i.variantLabel && `(${i.variantLabel})`} × {i.quantity}</span>
            <span>{formatMoney(i.unitPrice * i.quantity)}</span>
          </div>
        ))}
        <div className="summary-row"><span>Delivery Fee</span><span>{deliveryFee != null ? formatMoney(deliveryFee) : 'Select your region'}</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(total)}</span></div>
        {deliveryFee == null && <p className="form-hint">Total shown without delivery until you choose a region.</p>}
      </aside>
    </div>
  );
}