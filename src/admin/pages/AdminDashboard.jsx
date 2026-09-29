import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchRecentOrders } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';
import StatusPill from '../components/StatusPill';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchRecentOrders()])
      .then(([s, o]) => { setStats(s); setOrders(o); })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!stats) return <p className="empty-state">Could not load the dashboard. Please refresh the page.</p>;

  return (
    <div>
      <div className="admin-header"><h1>Dashboard</h1></div>

      <div className="admin-stat-cards">
        <div className="admin-stat-card"><span>{formatMoney(stats.totalSales)}</span><label>Total Sales</label></div>
        <div className="admin-stat-card"><span>{formatMoney(stats.todaySales)}</span><label>Today's Sales</label></div>
        <div className="admin-stat-card"><span>{stats.totalOrders}</span><label>Total Orders</label></div>
        <div className="admin-stat-card"><span>{stats.pendingOrders}</span><label>Pending Orders</label></div>
        <div className="admin-stat-card"><span>{stats.deliveredOrders}</span><label>Delivered Orders</label></div>
        <div className="admin-stat-card"><span>{stats.totalCustomers}</span><label>Total Customers</label></div>
        <div className="admin-stat-card"><span>{stats.totalProducts}</span><label>Total Products</label></div>
        <div className="admin-stat-card"><span>{stats.lowStockCount}</span><label>Low Stock Products</label></div>
      </div>

      <div className="admin-section-title">
        <h2>Recent Orders</h2>
        <Link to="/admin/orders" className="account-inline-link">View all</Link>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                <td>{o.customer_name}</td>
                <td>{formatMoney(o.total)}</td>
                <td><StatusPill status={o.payment_status} /></td>
                <td><StatusPill status={o.status} /></td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="empty-state">No orders yet.</p>}
      </div>
    </div>
  );
}
