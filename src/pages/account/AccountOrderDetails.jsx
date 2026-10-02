import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AccountLayout from './AccountLayout';
import { fetchOrderById } from '../../services/orders';
import { formatMoney, formatOrderStatus, orderHelpWhatsappUrl, siteConfig } from '../../config/siteConfig';
import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import PageLoader from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchReviewedProductIds, submitReview } from '../../services/reviews';
import { THUMB_WIDTH, imageFallback, thumbUrl } from '../../lib/imageUrl';
import { safeExternalUrl } from '../../lib/safeUrl';

const PRODUCT_PLACEHOLDER = '/assets/placeholder-product.jpg';

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

  const backLink = <Link to="/account/orders" className="account-back-link">← Back to orders</Link>;

  if (loading) return <AccountLayout><PageLoader /></AccountLayout>;
  if (!order) return <AccountLayout>{backLink}<p className="empty-state">Order not found.</p></AccountLayout>;

  const history = [...(order.order_status_history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const items = order.order_items || [];

  return (
    <AccountLayout>
      <div className="order-detail-topline">{backLink}</div>
      <div className="order-detail-header">
        <div>
          <h1>Order {order.order_number}</h1>
          <p className="order-detail-date">Placed {new Date(order.created_at).toLocaleString('en-GH')}</p>
        </div>
        <div className="order-detail-badges">
          <span className="badge status-badge">{formatOrderStatus(order.status)}</span>
          <span className="order-payment-status">Payment: {formatOrderStatus(order.payment_status)}</span>
        </div>
      </div>

      <section className="order-detail-section order-detail-items">
        <h2>Items <span>({items.length})</span></h2>
        <div className="order-items-list">
          {items.map((item) => {
            const images = item.product_images || [];
            const image = images.find((entry) => entry.is_primary)?.url || images[0]?.url || PRODUCT_PLACEHOLDER;
            return (
              <article key={item.id} className="order-item-row">
                <img
                  className="order-item-image"
                  src={thumbUrl(image)}
                  alt={item.product_name}
                  width={THUMB_WIDTH}
                  height={Math.round(THUMB_WIDTH * 1.25)}
                  loading="lazy"
                  decoding="async"
                  onError={imageFallback(image, PRODUCT_PLACEHOLDER)}
                />
                <div className="order-item-details">
                  <div className="order-item-main">
                    <div className="order-item-name">
                      <h3>{item.product_name}</h3>
                      <span>Qty: {item.quantity}</span>
                      {item.variant_summary && <span className="order-item-variant">{item.variant_summary}</span>}
                    </div>
                    <span className="order-item-price">{formatMoney(item.subtotal)}</span>
                  </div>
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
              </article>
            );
          })}
        </div>

        <div className="order-total-list">
          <div><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
          {Number(order.delivery_fee) > 0 && <div><span>Delivery</span><span>{formatMoney(order.delivery_fee)}</span></div>}
          {Number(order.discount) > 0 && <div><span>Discount</span><span>-{formatMoney(order.discount)}</span></div>}
          <div className="order-grand-total"><strong>Total</strong><strong>{formatMoney(order.total)}</strong></div>
        </div>
      </section>

      <div className="order-detail-info-grid">
        <section className="order-detail-section">
          <h2>Delivery</h2>
          <address className="order-delivery-address">
            {[order.delivery_city, order.delivery_region].filter(Boolean).join(', ')}
            {order.delivery_area && <span>{order.delivery_area}</span>}
            {order.delivery_digital_address && <span>Digital address: {order.delivery_digital_address}</span>}
          </address>
          {(order.courier_name || order.tracking_number) && (
            <div className="order-tracking-details">
              {order.courier_name && <span>{order.courier_name}</span>}
              {order.tracking_number && (
                safeExternalUrl(order.external_tracking_url)
                  ? <a href={safeExternalUrl(order.external_tracking_url)} target="_blank" rel="noreferrer">Track {order.tracking_number}</a>
                  : <span>Tracking number: {order.tracking_number}</span>
              )}
            </div>
          )}
        </section>

        <section className="order-detail-section order-payment-summary">
          <h2>Payment</h2>
          <div><span>Status</span><strong>{formatOrderStatus(order.payment_status)}</strong></div>
          <div><span>Order total</span><strong>{formatMoney(order.total)}</strong></div>
          {order.payment_reference && <div><span>Reference</span><span>{order.payment_reference}</span></div>}
        </section>
      </div>

      {history.length > 0 && (
        <section className="order-detail-section order-status-history">
          <h2>Order history</h2>
          <ol className="status-history-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <span className="status-history-label">{formatOrderStatus(entry.status)}</span>
                <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('en-GH')}</time>
                {entry.note && <span className="status-history-note">{entry.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <OrderHelp orderNumber={order.order_number} />
    </AccountLayout>
  );
}

function OrderHelp({ orderNumber }) {
  return (
    <aside className="order-help" aria-labelledby="order-help-title">
      <div className="order-help-text">
        <h3 id="order-help-title">Need help with this order?</h3>
        <p>Message us on WhatsApp ({siteConfig.whatsappDisplay}). Your order number is already filled in.</p>
      </div>
      <a
        href={orderHelpWhatsappUrl(orderNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-whatsapp btn-sm"
      >
        <WhatsAppIcon size={18} />
        Chat on WhatsApp
      </a>
    </aside>
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
      <p className="account-order-review-title">Review {item.product_name}</p>
      <label>
        Rating
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
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="How does it wear, look and feel?" />
      </label>
      <button className="btn btn-outline btn-sm" type="submit" disabled={saving}>
        {saving ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
