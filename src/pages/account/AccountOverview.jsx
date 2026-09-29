import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import OrderRow from './OrderRow';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrders } from '../../services/orders';
import { fetchWishlist } from '../../services/wishlist';

export default function AccountOverview() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchMyOrders(user.id).then(setOrders).catch(() => {});
    fetchWishlist(user.id).then((w) => setWishlistCount(w.length)).catch(() => {});
  }, [user]);

  return (
    <AccountLayout>
      <h1>My Account</h1>
      <div className="account-stats">
        <div className="stat-card"><span>{orders.length}</span><label>Orders</label></div>
        <div className="stat-card"><span>{wishlistCount}</span><label>Wishlist Items</label></div>
        <div className="stat-card stat-card-text"><span>{profile?.email}</span><label>Email</label></div>
      </div>

      <div className="section-header account-section-header">
        <h2>Recent Orders</h2>
        {orders.length > 5 && <Link to="/account/orders" className="account-inline-link">View all</Link>}
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>You have no orders yet.</p>
          <Link to="/shop" className="btn btn-primary btn-sm">Start shopping</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.slice(0, 5).map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </AccountLayout>
  );
}
