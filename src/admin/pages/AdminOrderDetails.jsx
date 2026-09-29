import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAdminOrderById, updateOrderStatus, updateOrderShipping } from '../../services/admin';
import { formatMoney, formatOrderStatus } from '../../config/siteConfig';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';
import StatusPill from '../components/StatusPill';

const STATUSES = ['pending_payment', 'paid', 'processing', 'packaged', 'dispatched', 'in_transit', 'delivered', 'cancelled', 'refunded'];

// "0241234567" -> "233241234567" for wa.me links
function toWhatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
}

export default function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [shipping, setShipping] = useState({ courier_name: '', tracking_number: '', external_tracking_url: '', estimated_delivery: '' });
  const { showToast } = useToast();

  function load() {
    fetchAdminOrderById(id).then((o) => {
      setOrder(o);
      setNewStatus(o.status);
      setShipping({
        courier_name: o.courier_name || '', tracking_number: o.tracking_number || '',
        external_tracking_url: o.external_tracking_url || '', estimated_delivery: o.estimated_delivery || '',
      });
    }).catch(() => setOrder(null)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function handleStatusUpdate(e) {
    e.preventDefault();
    setSavingStatus(true);
    try {
      await updateOrderStatus(id, newStatus, note);
      showToast('Order status updated');
      setNote('');
      load();
    } catch {
      showToast('Could not update status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleShippingSave(e) {
    e.preventDefault();
    setSavingShipping(true);
    try {
      // An empty date field must be saved as null, not '' (Postgres rejects '').
      await updateOrderShipping(id, { ...shipping, estimated_delivery: shipping.estimated_delivery || null });
      showToast('Shipping details saved');
      load();
    } catch {
      showToast('Could not save shipping details.', 'error');
    } finally {
      setSavingShipping(false);
    }
  }

  const backLink = <Link to="/admin/orders" className="account-back-link">← Back to orders</Link>;

  if (loading) return <PageLoader />;
  if (!order) return <>{backLink}<p className="empty-state">Order not found.</p></>;

  const history = [...(order.order_status_history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const updateShipping = (field) => (e) => setShipping((s) => ({ ...s, [field]: e.target.value }));

  return (
    <div className="admin-order">
      {backLink}
      <div className="admin-header admin-order-header">
        <div>
          <h1>Order {order.order_number}</h1>
          <p className="admin-order-date">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="admin-order-pills">
          <StatusPill status={order.status} />
          <StatusPill status={order.payment_status} />
        </div>
      </div>

      <div className="admin-order-grid">
        <div className="admin-order-main">
          <section className="admin-panel">
            <h2>Items</h2>
            <div className="order-items-list">
              {order.order_items.map((item) => (
                <div key={item.id} className="order-item-row">
                  <div className="order-item-name">
                    <span>{item.product_name} × {item.quantity}</span>
                    {item.variant_summary && <span className="order-item-variant">{item.variant_summary}</span>}
                  </div>
                  <span className="order-item-price">{formatMoney(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="summary-row"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
            <div className="summary-row"><span>Delivery ({order.delivery_region})</span><span>{formatMoney(order.delivery_fee)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(order.total)}</span></div>
          </section>

          <section className="admin-panel">
            <h2>Update status</h2>
            <form className="admin-inline-form" onSubmit={handleStatusUpdate}>
              <label className="visually-hidden" htmlFor="order-status">New status</label>
              <select id="order-status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}
              </select>
              <label className="visually-hidden" htmlFor="order-note">Internal note</label>
              <input id="order-note" placeholder="Internal note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-primary btn-sm" type="submit" disabled={savingStatus}>{savingStatus ? 'Updating…' : 'Update'}</button>
            </form>
          </section>

          <section className="admin-panel">
            <h2>Courier / tracking</h2>
            <form onSubmit={handleShippingSave}>
              <div className="form-row">
                <div className="form-group"><label htmlFor="ship-courier">Courier name</label><input id="ship-courier" value={shipping.courier_name} onChange={updateShipping('courier_name')} /></div>
                <div className="form-group"><label htmlFor="ship-tracking">Tracking number</label><input id="ship-tracking" value={shipping.tracking_number} onChange={updateShipping('tracking_number')} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label htmlFor="ship-url">External tracking URL</label><input id="ship-url" type="url" value={shipping.external_tracking_url} onChange={updateShipping('external_tracking_url')} /></div>
                <div className="form-group"><label htmlFor="ship-eta">Estimated delivery</label><input id="ship-eta" type="date" value={shipping.estimated_delivery || ''} onChange={updateShipping('estimated_delivery')} /></div>
              </div>
              <button className="btn btn-outline btn-sm" type="submit" disabled={savingShipping}>{savingShipping ? 'Saving…' : 'Save tracking'}</button>
            </form>
          </section>
        </div>

        <aside className="admin-order-side">
          <section className="admin-panel">
            <h2>Customer</h2>
            <dl className="admin-info-list">
              <div><dt>Name</dt><dd>{order.customer_name}</dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></dd></div>
              <div><dt>Phone</dt><dd><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></dd></div>
            </dl>
            <a className="btn btn-whatsapp btn-sm btn-block" href={`https://wa.me/${toWhatsAppNumber(order.customer_phone)}?text=${encodeURIComponent(`Hi ${order.customer_name}, this is TheStrandBrand about your order ${order.order_number}.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>
          </section>

          <section className="admin-panel">
            <h2>Delivery address</h2>
            <dl className="admin-info-list">
              <div><dt>Region</dt><dd>{order.delivery_region}</dd></div>
              <div><dt>City / town</dt><dd>{order.delivery_city}</dd></div>
              {order.delivery_area && <div><dt>Area</dt><dd>{order.delivery_area}</dd></div>}
              {order.delivery_digital_address && <div><dt>Digital address</dt><dd>{order.delivery_digital_address}</dd></div>}
              {order.delivery_directions && <div><dt>Directions</dt><dd>{order.delivery_directions}</dd></div>}
            </dl>
          </section>

          {history.length > 0 && (
            <section className="admin-panel">
              <h2>Status history</h2>
              <ul className="status-history-list">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className="status-history-label">{formatOrderStatus(h.status)}</span>
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                    {h.note && <span className="status-history-note">{h.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
