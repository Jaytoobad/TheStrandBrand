import { useEffect, useState } from 'react';
import { fetchAllReviews, setReviewStatus, deleteReview } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  function load() { fetchAllReviews().then(setReviews).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function handleApprove(r) {
    try { await setReviewStatus(r.id, { is_approved: true, is_hidden: false }); load(); } catch { showToast('Could not update review.', 'error'); }
  }
  async function handleHide(r) {
    try { await setReviewStatus(r.id, { is_hidden: !r.is_hidden }); load(); } catch { showToast('Could not update review.', 'error'); }
  }
  async function handleDelete(r) {
    if (!confirm('Delete this review permanently?')) return;
    try { await deleteReview(r.id); load(); } catch { showToast('Could not delete review.', 'error'); }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>Reviews</h1></div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Comment</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td>{r.products?.name}</td>
                <td>{r.profiles?.first_name} {r.profiles?.last_name}</td>
                <td>{'★'.repeat(r.rating)}</td>
                <td style={{ maxWidth: 240 }}>{r.comment}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>{r.is_hidden ? 'Hidden' : r.is_approved ? 'Approved' : 'Pending'}</td>
                <td className="table-actions">
                  {!r.is_approved && <button className="btn btn-sm btn-outline" onClick={() => handleApprove(r)}>Approve</button>}
                  <button className="btn btn-sm btn-outline" onClick={() => handleHide(r)}>{r.is_hidden ? 'Unhide' : 'Hide'}</button>
                  <button className="btn btn-sm btn-outline" onClick={() => handleDelete(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.length === 0 && <p className="empty-state">No reviews yet.</p>}
      </div>
    </div>
  );
}
