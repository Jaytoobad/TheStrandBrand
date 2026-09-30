import { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchSalesOverTime, fetchAllProducts } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboardStats(), fetchSalesOverTime(range), fetchAllProducts()])
      .then(([s, sale, p]) => { setStats(s); setSales(sale); setProducts(p); })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) return <PageLoader />;

  if (!stats) return <p className="empty-state">Could not load analytics. Please refresh the page.</p>;

  // Average over paid orders only; unpaid checkouts would drag it down.
  const avgOrderValue = stats.paidOrderCount ? stats.totalSales / stats.paidOrderCount : 0;
  // Made-to-order products don't use stock, so they never show as low stock.
  const lowStock = products.filter((p) => p.is_active && !p.allow_preorder && p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 8);
  const ordersInRange = sales.length;

  return (
    <div>
      <div className="admin-header">
        <h1>Analytics</h1>
        <select className="admin-select" aria-label="Date range" value={range} onChange={(e) => setRange(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 3 months</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      <div className="admin-stat-cards">
        <div className="admin-stat-card"><span>{formatMoney(stats.totalSales)}</span><label>Total Revenue</label></div>
        <div className="admin-stat-card"><span>{stats.paidOrderCount}</span><label>Paid Orders (all time)</label></div>
        <div className="admin-stat-card"><span>{formatMoney(avgOrderValue)}</span><label>Average Order Value</label></div>
        <div className="admin-stat-card"><span>{stats.totalCustomers}</span><label>Total Customers</label></div>
        <div className="admin-stat-card"><span>{ordersInRange}</span><label>Paid Orders (selected range)</label></div>
      </div>

      <h3 className="admin-table-title">Low-Stock Products</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Product</th><th>Stock</th></tr></thead>
          <tbody>
            {lowStock.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.stock}</td></tr>)}
          </tbody>
        </table>
        {lowStock.length === 0 && <p className="empty-state">No low-stock products right now.</p>}
      </div>
    </div>
  );
}
