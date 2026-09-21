import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import { fetchOrderById } from '../../services/orders';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

export default function AccountOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderById(id).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AccountLayout><PageLoader /></AccountLayout>;
  if (!order) return <AccountLayout><p className="empty-state">Order not found.</p></AccountLayout>;

  return (
    <AccountLayout>
      <h1>Order {order.order_number}</h1>
      <span className="badge status-badge">{order.status.replace('_', ' ')}</span>

      <h3>Items</h3>
      <div className="order-items-list">
        {order.order_items.map((item) => (
          <div key={item.id} className="order-item-row">
            <span>{item.product_name} {item.variant_summary && `(${item.variant_summary})`} × {item.quantity}</span>
            <span>{formatMoney(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(order.total)}</span></div>

      <h3>Delivery</h3>
      <p>{order.delivery_city}, {order.delivery_region}</p>

      <h3>Status History</h3>
      <ul className="status-history-list">
        {order.order_status_history?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((h) => (
          <li key={h.id}>{h.status.replace('_', ' ')} — {new Date(h.created_at).toLocaleString()}</li>
        ))}
      </ul>
    </AccountLayout>
  );
}
