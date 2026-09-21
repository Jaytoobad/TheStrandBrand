import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAdminOrderById, updateOrderStatus, updateOrderShipping } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';

const STATUSES = ['pending_payment', 'paid', 'processing', 'packaged', 'dispatched', 'in_transit', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
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
    }).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function handleStatusUpdate() {
    try {
      await updateOrderStatus(id, newStatus, note);
      showToast('Order status updated');
      setNote('');
      load();
    } catch {
      showToast('Could not update status.', 'error');
    }
  }

  async function handleShippingSave() {
    try {
      await updateOrderShipping(id, shipping);
      showToast('Shipping details saved');
      load();
    } catch {
      showToast('Could not save shipping details.', 'error');
    }
  }

  if (loading) return <PageLoader />;
  if (!order) return <p className="empty-state">Order not found.</p>;

  return (
    <div>
      <div className="admin-header"><h1>Order {order.order_number}</h1></div>

      <div className="order-item-row" style={{ fontWeight: 700, marginBottom: 20 }}>
        <span>{order.customer_name} — {order.customer_email} — {order.customer_phone}</span>
      </div>

      <h3>Items</h3>
      <div className="order-items-list">
        {order.order_items.map((item) => (
          <div key={item.id} className="order-item-row">
            <span>{item.product_name} {item.variant_summary && `(${item.variant_summary})`} × {item.quantity}</span>
            <span>{formatMoney(item.subtotal)}</span>
          </div>
        ))}
      </div>
      <div className="summary-row"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
      <div className="summary-row"><span>Delivery Fee</span><span>{formatMoney(order.delivery_fee)}</span></div>
      <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(order.total)}</span></div>

      <h3 style={{ marginTop: 28 }}>Delivery Address</h3>
      <p>{order.delivery_area ? `${order.delivery_area}, ` : ''}{order.delivery_city}, {order.delivery_region}</p>
      {order.delivery_digital_address && <p>Digital address: {order.delivery_digital_address}</p>}
      {order.delivery_directions && <p>Directions: {order.delivery_directions}</p>}

      <h3 style={{ marginTop: 28 }}>Update Status</h3>
      <div className="admin-toolbar">
        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <input placeholder="Internal note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate}>Update</button>
      </div>

      <h3 style={{ marginTop: 28 }}>Courier / Tracking</h3>
      <div className="admin-form" style={{ maxWidth: 480 }}>
        <div className="form-group"><label>Courier Name</label><input value={shipping.courier_name} onChange={(e) => setShipping({ ...shipping, courier_name: e.target.value })} /></div>
        <div className="form-group"><label>Tracking Number</label><input value={shipping.tracking_number} onChange={(e) => setShipping({ ...shipping, tracking_number: e.target.value })} /></div>
        <div className="form-group"><label>External Tracking URL</label><input value={shipping.external_tracking_url} onChange={(e) => setShipping({ ...shipping, external_tracking_url: e.target.value })} /></div>
        <div className="form-group"><label>Estimated Delivery</label><input type="date" value={shipping.estimated_delivery || ''} onChange={(e) => setShipping({ ...shipping, estimated_delivery: e.target.value })} /></div>
        <button className="btn btn-outline btn-sm" onClick={handleShippingSave}>Save</button>
      </div>

      <h3 style={{ marginTop: 28 }}>Status History</h3>
      <ul className="status-history-list">
        {order.order_status_history?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((h) => (
          <li key={h.id}>{h.status.replace('_', ' ')} — {new Date(h.created_at).toLocaleString()} {h.note && `— ${h.note}`}</li>
        ))}
      </ul>
    </div>
  );
}
