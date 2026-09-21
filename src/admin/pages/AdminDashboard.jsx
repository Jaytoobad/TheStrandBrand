import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchRecentOrders } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchRecentOrders()])
      .then(([s, o]) => { setStats(s); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

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

      <h2 style={{ marginBottom: 16 }}>Recent Orders</h2>
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
                <td>{o.payment_status}</td>
                <td>{o.status.replace('_', ' ')}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
