import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trackOrder } from '../services/orders';
import { formatMoney } from '../config/siteConfig';
 import usePageMeta from '../hooks/usePageMeta';

const STATUS_STEPS = ['paid', 'processing', 'packaged', 'dispatched', 'in_transit', 'delivered'];
const STATUS_LABELS = {
  pending_payment: 'Payment Pending',
  paid: 'Payment Confirmed',
  processing: 'Processing',
  packaged: 'Packaged',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default function TrackOrder() {
  usePageMeta('Track Your Order', 'Enter your order number to check your delivery status.');
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | not_found | found
  const [autoTried, setAutoTried] = useState(false);

  async function handleSearch(e) {
    e?.preventDefault();
    setStatus('loading');
    try {
      const result = await trackOrder({ orderNumber, contact });
      if (result) { setOrder(result); setStatus('found'); }
      else { setOrder(null); setStatus('not_found'); }
    } catch {
      setStatus('not_found');
    }
  }

  useEffect(() => {
    // If arriving with ?order=... from order confirmation, don't auto-search
    // (we still need the contact field — never expose an order from the
    // number alone).
    setAutoTried(true);
  }, []);

  const activeStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="container section track-order">
      <h1>Track Your Order</h1>
      <p className="track-intro">Enter your order number along with the email or phone number used at checkout.</p>

      <form className="track-form" onSubmit={handleSearch}>
        <div className="form-group">
          <label>Order Number</label>
          <input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="TSB-20260919-001" />
        </div>
        <div className="form-group">
          <label>Email or Phone</label>
          <input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com" />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={status === 'loading'}>
          {status === 'loading' ? 'Searching…' : 'Track Order'}
        </button>
      </form>

      {status === 'not_found' && (
        <div className="empty-state">
          <p>We couldn't find an order matching those details. Please double-check the order number and contact info.</p>
        </div>
      )}

      {status === 'found' && order && (
        <div className="track-result card">
          <div className="track-result-header">
            <div>
              <h2>{order.order_number}</h2>
              <span>{formatMoney(order.total)}</span>
            </div>
            <span className={`badge status-badge status-${order.status}`}>{STATUS_LABELS[order.status]}</span>
          </div>

          {order.status !== 'cancelled' && order.status !== 'refunded' && order.payment_status === 'paid' && (
            <ol className="status-timeline">
              {STATUS_STEPS.map((step, i) => (
                <li key={step} className={i <= activeStepIndex ? 'done' : ''}>
                  <span className="timeline-dot">{i <= activeStepIndex ? '✓' : '○'}</span>
                  {STATUS_LABELS[step]}
                </li>
              ))}
            </ol>
          )}

          {(order.tracking_number || order.courier_name) && (
            <div className="track-courier">
              {order.courier_name && <p>Courier: <strong>{order.courier_name}</strong></p>}
              {order.tracking_number && <p>Tracking #: <strong>{order.tracking_number}</strong></p>}
              {order.external_tracking_url && <a href={order.external_tracking_url} target="_blank" rel="noreferrer">Track with courier →</a>}
            </div>
          )}

          <p className="track-destination">Delivering to: {order.delivery_city}, {order.delivery_region}</p>
        </div>
      )}
    </div>
  );
}
