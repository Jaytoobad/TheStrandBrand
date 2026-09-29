import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import OrderRow from './OrderRow';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrders } from '../../services/orders';
import PageLoader from '../../components/PageLoader';

export default function AccountOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMyOrders(user.id).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, [user]);

  return (
    <AccountLayout>
      <h1>My Orders</h1>
      {loading ? <PageLoader /> : orders.length === 0 ? (
        <div className="empty-state">
          <p>You have no orders yet.</p>
          <Link to="/shop" className="btn btn-primary btn-sm">Start shopping</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </AccountLayout>
  );
}
