import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import { fetchOrderById } from '../../services/orders';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchReviewedProductIds, submitReview } from '../../services/reviews';

export default function AccountOrderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [reviewedProductIds, setReviewedProductIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadOrder() {
      try {
        const result = await fetchOrderById(id);
        if (!active) return;
        setOrder(result);
        if (user?.id && result.status === 'delivered') {
          const reviewed = await fetchReviewedProductIds(id, user.id);
          if (active) setReviewedProductIds(reviewed);
        }
      } catch {
        if (active) setOrder(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOrder();
    return () => { active = false; };
  }, [id, user?.id]);

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
            {order.status === 'delivered' && item.product_id && (
              <div className="account-order-review">
                {reviewedProductIds.includes(item.product_id) ? (
                  <p>Thanks. Your review has been submitted for moderation.</p>
                ) : (
                  <ReviewForm orderId={order.id} item={item} userId={user.id} showToast={showToast} onSubmitted={() => setReviewedProductIds((ids) => [...ids, item.product_id])} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(order.total)}</span></div>

      <h3>Delivery</h3>
      <p>{order.delivery_city}, {order.delivery_region}</p>

      <h3>Status History</h3>
      <ul className="status-history-list">
        {order.order_status_history?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((h) => (
          <li key={h.id}>{h.status.replace('_', ' ')} · {new Date(h.created_at).toLocaleString()}</li>
        ))}
      </ul>
    </AccountLayout>
  );
}

function ReviewForm({ orderId, item, userId, showToast, onSubmitted }) {
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await submitReview({
        productId: item.product_id,
        orderId,
        rating: Number(rating),
        comment: comment.trim(),
        userId,
      });
      onSubmitted();
      showToast('Review submitted for moderation.');
    } catch {
      showToast('Could not submit your review. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="account-order-review-form" onSubmit={handleSubmit}>
      <label>
        Your rating for {item.product_name}
        <select value={rating} onChange={(event) => setRating(event.target.value)}>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </label>
      <label>
        Review
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} />
      </label>
      <button className="btn btn-outline btn-sm" type="submit" disabled={saving}>
        {saving ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
