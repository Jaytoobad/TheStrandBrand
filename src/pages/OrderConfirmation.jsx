import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { verifyPayment } from '../services/orders';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/PageLoader';
import DeliveryEstimate from '../components/DeliveryEstimate';

const REDIRECT_SECONDS = 6;

function readPendingContact() {
  try {
    return sessionStorage.getItem('tsb_pending_contact') || '';
  } catch {
    return '';
  }
}

function clearPendingCheckout() {
  try {
    sessionStorage.removeItem('tsb_pending_order');
    sessionStorage.removeItem('tsb_pending_contact');
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

// Paystack redirects here with ?reference=xxxx after the customer pays.
// We verify server-side (never trust the redirect itself) before showing
// "Order Confirmed" — see supabase/functions/verify-payment. Then we move the
// customer on to where they can follow the order.
export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [contact] = useState(readPendingContact);

  useEffect(() => {
    if (!reference) { setStatus('failed'); setError('Missing payment reference.'); return; }
    let active = true;
    verifyPayment(reference)
      .then((result) => {
        if (!active) return;
        setOrderId(result.orderId ?? null);
        setStatus('success');
      })
      .catch((err) => {
        if (!active) return;
        setStatus('failed');
        setError(err.message);
      });
    return () => { active = false; };
  }, [reference]);

  // Signed-in customers go to the order in their account; guests go to Track
  // Order with the lookup done for them (email kept from checkout).
  const destination = useMemo(() => {
    if (user && orderId) {
      return { to: `/account/orders/${orderId}`, label: 'your order details', state: undefined };
    }
    return {
      to: `/track-order?order=${encodeURIComponent(orderNumber)}`,
      label: 'order tracking',
      state: contact ? { contact } : undefined,
    };
  }, [user, orderId, orderNumber, contact]);

  useEffect(() => {
    if (status !== 'success' || authLoading) return undefined;
    if (secondsLeft <= 0) {
      clearPendingCheckout();
      navigate(destination.to, { replace: true, state: destination.state });
      return undefined;
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [status, authLoading, secondsLeft, destination, navigate]);

  if (status === 'verifying') return <PageLoader />;

  if (status === 'failed') {
    return (
      <div className="container section empty-state">
        <h1>We couldn't confirm this payment</h1>
        <p>{error || 'Please check your order under "Track Order" or contact us for help.'}</p>
        <Link to="/track-order" className="btn btn-primary">Track Order</Link>
      </div>
    );
  }

  return (
    <div className="container section order-confirmation">
      <div className="confirmation-icon">✓</div>
      <h1>Order Confirmed</h1>
      <p className="order-number">Order Number: <strong>{orderNumber}</strong></p>
      <p>Thank you for your order. Your payment is confirmed, and we are preparing your custom wig.</p>
      <DeliveryEstimate compact />
      <p>You confirmed the Refund &amp; Return Policy at checkout.</p>
      <p className="confirmation-redirect" role="status" aria-live="polite">
        Taking you to {destination.label} in {Math.max(secondsLeft, 0)}s…
      </p>
      <div className="confirmation-actions">
        <Link to={destination.to} state={destination.state} className="btn btn-primary" onClick={clearPendingCheckout}>
          {user && orderId ? 'View My Order' : 'Track Order'}
        </Link>
        <Link to="/shop" className="btn btn-outline" onClick={clearPendingCheckout}>Continue Shopping</Link>
      </div>
    </div>
  );
}
