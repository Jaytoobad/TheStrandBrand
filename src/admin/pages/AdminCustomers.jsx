import { useEffect, useState } from 'react';
import { fetchAllCustomers } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllCustomers().then(setCustomers).finally(() => setLoading(false)); }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>Customers</h1></div>
      <div className="data-table-wrap">
        <table className="data-table is-stacked">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Paid orders</th><th>Total Spent</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="cell-primary">{c.first_name} {c.last_name}</td>
                <td data-label="Email"><a href={`mailto:${c.email}`}>{c.email}</a></td>
                <td data-label="Phone">{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—'}</td>
                <td data-label="Joined">{new Date(c.created_at).toLocaleDateString()}</td>
                <td data-label="Paid orders">{c.orderCount}</td>
                <td data-label="Total spent">{formatMoney(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="empty-state">No customers found.</p>}
      </div>
    </div>
  );
}
