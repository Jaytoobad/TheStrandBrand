import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchApprovedReviewsPage, fetchReviewableProducts, submitReview } from '../services/reviews';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';

const RATING_OPTIONS = ['5', '4', '3', '2', '1'];

export default function Reviews() {
  usePageMeta('Customer Reviews', 'Read what TheStrandBrand customers say about their wigs, and leave a review of your own.');
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchApprovedReviewsPage()
      .then((data) => { if (active) setReviews(data); })
      .catch(() => { if (active) setReviews([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    if (reviews.length === 0) return null;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return {
      count: reviews.length,
      average: (total / reviews.length).toFixed(1),
      distribution: RATING_OPTIONS.map((value) => ({
        rating: Number(value),
        count: reviews.filter((review) => review.rating === Number(value)).length,
      })),
    };
  }, [reviews]);

  const requestedSlug = searchParams.get('product');

  return (
    <div className="container section reviews-page">
      <header className="reviews-page-header">
        <h1>Customer Reviews</h1>
        <p>
          Every review here comes from a customer whose order was delivered. Reviews are
          published after a quick check, so what you read is from a real purchase.
        </p>
      </header>

      {loading && <p className="empty-state">Loading reviews…</p>}

      {!loading && summary && (
        <section className="reviews-summary card" aria-label="Rating summary">
          <div className="reviews-summary-score">
            <span className="reviews-summary-average">{summary.average}</span>
            <span className="reviews-summary-stars" aria-hidden="true">
              {'★'.repeat(Math.round(Number(summary.average)))}{'☆'.repeat(5 - Math.round(Number(summary.average)))}
            </span>
            <span className="reviews-summary-count">
              Based on {summary.count} review{summary.count === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="reviews-summary-bars">
            {summary.distribution.map(({ rating, count }) => (
              <li key={rating}>
                <span className="reviews-summary-bar-label">{rating} star</span>
                <span className="reviews-summary-bar">
                  <span
                    className="reviews-summary-bar-fill"
                    style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }}
                  />
                </span>
                <span className="reviews-summary-bar-count">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && reviews.length === 0 && (
        <p className="empty-state">
          No reviews yet. Once your order is delivered you can be the first to review a product.
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="reviews-grid">
          {reviews.map((review) => (
            <li key={review.id} className="review-card card">
              <div className="review-card-head">
                <span className="review-card-stars" aria-hidden="true">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </span>
                <span className="visually-hidden">{`Rated ${review.rating} out of 5 stars`}</span>
                <time dateTime={review.created_at}>
                  {new Date(review.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </time>
              </div>
              <p className="review-card-comment">{review.comment}</p>
              <p className="review-card-author">Verified Customer</p>
              {review.products ? (
                <Link className="review-card-product" to={`/product/${review.products.slug}`}>
                  {review.products.name}
                </Link>
              ) : (
                <span className="review-card-product">Product no longer listed</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <WriteReviewSection
        user={user}
        showToast={showToast}
        requestedSlug={requestedSlug}
        onSubmitted={() => {
          setLoading(true);
          fetchApprovedReviewsPage()
            .then(setReviews)
            .catch(() => {})
            .finally(() => setLoading(false));
        }}
      />
    </div>
  );
}

function WriteReviewSection({ user, showToast, requestedSlug, onSubmitted }) {
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setLoading(true);
    fetchReviewableProducts(user.id)
      .then((items) => {
        if (!active) return;
        setEligible(items);
        // Deep link from a product page (?product=slug) preselects that product
        // when the customer is allowed to review it.
        const requested = requestedSlug
          ? items.find((item) => item.productSlug === requestedSlug)
          : null;
        setSelectedKey(requested ? keyFor(requested) : (items[0] ? keyFor(items[0]) : ''));
      })
      .catch(() => { if (active) setEligible([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, requestedSlug]);

  async function handleSubmit(event) {
    event.preventDefault();
    const chosen = eligible.find((item) => keyFor(item) === selectedKey);
    if (!chosen) return;
    if (comment.trim().length < 10) {
      showToast('Please write at least a short sentence about the product.', 'error');
      return;
    }
    setSaving(true);
    try {
      await submitReview({
        productId: chosen.productId,
        orderId: chosen.orderId,
        rating: Number(rating),
        comment: comment.trim(),
        userId: user.id,
      });
      setComment('');
      setRating('5');
      setEligible((current) => current.filter((item) => keyFor(item) !== keyFor(chosen)));
      showToast('Thank you. Your review was sent for a quick check before it appears.');
      onSubmitted();
    } catch (error) {
      showToast(error?.message || 'Could not submit your review. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="write" className="reviews-write card" aria-labelledby="reviews-write-title">
      <h2 id="reviews-write-title">Write a review</h2>

      {!user && (
        <p className="reviews-write-gate">
          <Link to="/login">Sign in</Link> to review a product you have ordered. Reviews are
          only accepted from customers whose order has been delivered.
        </p>
      )}

      {user && loading && <p className="empty-state">Checking your delivered orders…</p>}

      {user && !loading && eligible.length === 0 && (
        <p className="reviews-write-gate">
          You have no products waiting for a review. Once an order you placed is marked
          delivered, you can review the items in it here or from the order page.
        </p>
      )}

      {user && !loading && eligible.length > 0 && (
        <form className="reviews-write-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="review-product">Product</label>
            <select id="review-product" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
              {eligible.map((item) => (
                <option key={keyFor(item)} value={keyFor(item)}>{item.productName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="review-rating">Rating</label>
            <select id="review-rating" value={rating} onChange={(event) => setRating(event.target.value)}>
              {RATING_OPTIONS.map((value) => (
                <option key={value} value={value}>{value} star{value === '1' ? '' : 's'}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="review-comment">Your review</label>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="How does it wear, look and feel? How long did the delivery take?"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}
    </section>
  );
}

function keyFor(item) {
  return `${item.orderId}:${item.productId}`;
}
