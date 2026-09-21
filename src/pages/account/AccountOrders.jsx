import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrders } from '../../services/orders';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

export default function AccountOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMyOrders(user.id).then(setOrders).finally(() => setLoading(false));
  }, [user]);

  return (
    <AccountLayout>
      <h1>My Orders</h1>
      {loading ? <PageLoader /> : orders.length === 0 ? (
        <p className="empty-state">You have no orders yet. <Link to="/shop">Start shopping</Link></p>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <Link key={o.id} to={`/account/orders/${o.id}`} className="order-row card">
              <span>{o.order_number}</span>
              <span>{o.order_items?.length} item(s)</span>
              <span>{formatMoney(o.total)}</span>
              <span className="badge status-badge">{o.status.replace('_', ' ')}</span>
            </Link>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
