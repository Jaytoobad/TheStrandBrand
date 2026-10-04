import { useEffect, useState } from 'react';
import { fetchAllReviews, setReviewStatus, deleteReview } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadError from '../components/LoadError';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const { showToast } = useToast();

  function load() { setLoadError(false); fetchAllReviews().then(setReviews).catch(() => setLoadError(true)).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function handleApprove(r) {
    try { await setReviewStatus(r.id, { is_approved: true, is_hidden: false }); load(); } catch { showToast('Could not update review.', 'error'); }
  }
  async function handleHide(r) {
    try { await setReviewStatus(r.id, { is_hidden: !r.is_hidden }); load(); } catch { showToast('Could not update review.', 'error'); }
  }
  async function handleDelete() {
    const r = pendingDelete;
    setPendingDelete(null);
    try { await deleteReview(r.id); load(); } catch { showToast('Could not delete review.', 'error'); }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>Reviews</h1></div>
      {loadError && <LoadError what="reviews" onRetry={load} />}
      <div className="data-table-wrap">
        <table className="data-table is-stacked">
          <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Comment</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className="cell-primary">{r.products?.name}</td>
                <td data-label="Customer">{r.profiles?.first_name} {r.profiles?.last_name}</td>
                <td data-label="Rating" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}</td>
                <td data-label="Comment" className="cell-wide">{r.comment}</td>
                <td data-label="Date">{new Date(r.created_at).toLocaleDateString()}</td>
                <td data-label="Status"><span className={`admin-pill ${r.is_hidden ? 'is-neutral' : r.is_approved ? 'is-good' : 'is-warn'}`}>{r.is_hidden ? 'Hidden' : r.is_approved ? 'Approved' : 'Pending'}</span></td>
                <td className="table-actions">
                  {!r.is_approved && <button className="btn btn-sm btn-outline" onClick={() => handleApprove(r)}>Approve</button>}
                  <button className="btn btn-sm btn-outline" onClick={() => handleHide(r)}>{r.is_hidden ? 'Unhide' : 'Hide'}</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setPendingDelete(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.length === 0 && <p className="empty-state">No reviews yet.</p>}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this review?"
        message="It will be removed permanently. To keep it but stop showing it, use Hide instead."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
