import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { trackOrder } from '../services/orders';
import { formatMoney } from '../config/siteConfig';
import DeliveryEstimate from '../components/DeliveryEstimate';
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
  const location = useLocation();
  // Order confirmation passes the checkout email in router state (never in the
  // URL), so a guest lands straight on their order after paying.
  const handoffContact = location.state?.contact || '';
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [contact, setContact] = useState(handoffContact);
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | not_found | found

  async function runSearch(number, contactValue) {
    setStatus('loading');
    try {
      const result = await trackOrder({ orderNumber: number, contact: contactValue });
      if (result) { setOrder(result); setStatus('found'); }
      else { setOrder(null); setStatus('not_found'); }
    } catch {
      setStatus('not_found');
    }
  }

  function handleSearch(e) {
    e?.preventDefault();
    runSearch(orderNumber, contact);
  }

  useEffect(() => {
    // Auto-search only when both the order number and contact were handed over;
    // an order is never exposed from the number alone.
    const initialOrder = searchParams.get('order');
    if (initialOrder && handoffContact) runSearch(initialOrder, handoffContact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="container section track-order">
      <h1>Track Your Order</h1>
      <p className="track-intro">Enter your order number along with the email or phone number used at checkout.</p>
      <DeliveryEstimate compact />

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

          {order.estimated_delivery && (
            <p className="track-eta">
              Current delivery estimate: <time dateTime={order.estimated_delivery}>{new Date(`${order.estimated_delivery}T00:00:00`).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            </p>
          )}

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
