import { formatOrderStatus } from '../../config/siteConfig';

// Colour-coded label for order and payment statuses in admin tables.
const TONES = {
  paid: 'is-good',
  delivered: 'is-good',
  processing: 'is-info',
  packaged: 'is-info',
  dispatched: 'is-info',
  in_transit: 'is-info',
  pending: 'is-warn',
  pending_payment: 'is-warn',
  failed: 'is-bad',
  cancelled: 'is-bad',
  refunded: 'is-neutral',
};

export default function StatusPill({ status }) {
  return <span className={`admin-pill ${TONES[status] || 'is-neutral'}`}>{formatOrderStatus(status)}</span>;
}
