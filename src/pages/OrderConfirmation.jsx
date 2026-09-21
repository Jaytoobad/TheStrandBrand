import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { verifyPayment } from '../services/orders';
import PageLoader from '../components/PageLoader';

// Paystack redirects here with ?reference=xxxx after the customer pays.
// We verify server-side (never trust the redirect itself) before showing
// "Order Confirmed" — see supabase/functions/verify-payment.
export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference) { setStatus('failed'); setError('Missing payment reference.'); return; }
    verifyPayment(reference)
      .then(() => setStatus('success'))
      .catch((err) => { setStatus('failed'); setError(err.message); });
  }, [reference]);

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
      <p>Thank you for your order! We've received your payment and your wig is being prepared for dispatch. A confirmation has been sent to your email.</p>
      <div className="confirmation-actions">
        <Link to={`/track-order?order=${orderNumber}`} className="btn btn-primary">Track Order</Link>
        <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
      </div>
    </div>
  );
}
