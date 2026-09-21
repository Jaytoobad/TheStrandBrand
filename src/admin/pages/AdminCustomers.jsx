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
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Total Spent</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td>{c.orderCount}</td>
                <td>{formatMoney(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="empty-state">No customers found.</p>}
      </div>
    </div>
  );
}
