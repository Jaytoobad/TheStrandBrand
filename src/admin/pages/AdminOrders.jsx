import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllOrders } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

const STATUSES = ['pending_payment', 'paid', 'processing', 'packaged', 'dispatched', 'in_transit', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');

  function load() {
    setLoading(true);
    fetchAllOrders({ status: status || undefined, paymentStatus: paymentStatus || undefined, search: search || undefined })
      .then(setOrders)
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, paymentStatus]);

  return (
    <div>
      <div className="admin-header"><h1>Orders</h1></div>

      <div className="admin-toolbar">
        <input placeholder="Search order #, customer, email…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">All payments</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button className="btn btn-sm btn-outline" onClick={load}>Search</button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                  <td>{o.customer_name}<br /><span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{o.customer_email}</span></td>
                  <td>{o.order_items?.length}</td>
                  <td>{formatMoney(o.total)}</td>
                  <td>{o.payment_status}</td>
                  <td>{o.status.replace('_', ' ')}</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="empty-state">No orders match your filters.</p>}
        </div>
      )}
    </div>
  );
}
