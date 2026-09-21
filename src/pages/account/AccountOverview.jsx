import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrders } from '../../services/orders';
import { fetchWishlist } from '../../services/wishlist';
import { formatMoney } from '../../config/siteConfig';

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
        <div className="stat-card"><span>{profile?.email}</span><label>Email</label></div>
      </div>

      <h2>Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="empty-state">You have no orders yet. <Link to="/shop">Start shopping</Link></p>
      ) : (
        <div className="order-list">
          {orders.slice(0, 5).map((o) => (
            <Link key={o.id} to={`/account/orders/${o.id}`} className="order-row card">
              <span>{o.order_number}</span>
              <span>{formatMoney(o.total)}</span>
              <span className="badge status-badge">{o.status.replace('_', ' ')}</span>
            </Link>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
