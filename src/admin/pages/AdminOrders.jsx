import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllOrders } from '../../services/admin';
import { formatMoney, formatOrderStatus } from '../../config/siteConfig'; // formatOrderStatus: filter labels
import PageLoader from '../../components/PageLoader';
import StatusPill from '../components/StatusPill';
import LoadError from '../components/LoadError';

const STATUSES = ['pending_payment', 'paid', 'processing', 'packaged', 'dispatched', 'in_transit', 'delivered', 'cancelled', 'expired', 'refunded'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoading(true);
    setLoadError(false);
    fetchAllOrders({ status: status || undefined, paymentStatus: paymentStatus || undefined, search: search || undefined })
      .then(setOrders)
      // An empty list is what a failed request used to produce, so the owner was
      // told they had no orders rather than that the request failed.
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, paymentStatus]);

  return (
    <div>
      <div className="admin-header"><h1>Orders</h1></div>
      {loadError && <LoadError what="orders" onRetry={load} />}

      <div className="admin-toolbar">
        <input type="search" aria-label="Search orders" placeholder="Search order #, customer, email…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}
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
          <table className="data-table is-stacked">
            <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-primary"><Link to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                  <td data-label="Customer"><span className="cell-value">{o.customer_name}<span className="table-subtext">{o.customer_email}</span></span></td>
                  <td data-label="Items">{o.order_items?.length}</td>
                  <td data-label="Total">{formatMoney(o.total)}</td>
                  <td data-label="Payment"><StatusPill status={o.payment_status} /></td>
                  <td data-label="Status"><StatusPill status={o.status} /></td>
                  <td data-label="Date">{new Date(o.created_at).toLocaleDateString()}</td>
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
