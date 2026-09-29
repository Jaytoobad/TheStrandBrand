import { Link } from 'react-router-dom';
import { formatMoney, formatOrderStatus } from '../../config/siteConfig';

// Shared order summary row used on the account overview and orders list.
export default function OrderRow({ order }) {
  const count = order.order_items?.length ?? 0;
  return (
    <Link to={`/account/orders/${order.id}`} className="order-row card">
      <span className="order-row-number">{order.order_number}</span>
      <span className="order-row-meta">{count} {count === 1 ? 'item' : 'items'}</span>
      <span className="order-row-total">{formatMoney(order.total)}</span>
      <span className="badge status-badge order-row-status">{formatOrderStatus(order.status)}</span>
    </Link>
  );
}
