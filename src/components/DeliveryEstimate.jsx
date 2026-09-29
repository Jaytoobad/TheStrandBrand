export default function DeliveryEstimate({ compact = false }) {
  return (
    <aside className={`delivery-estimate${compact ? ' compact' : ''}`} aria-label="Preorder preparation and delivery estimate">
      <strong>Custom made to order</strong>
      <span>Each wig is made after you preorder. Allow 7 days for preparation, then 2 to 3 days for delivery. Estimated total: 9 to 10 days.</span>
    </aside>
  );
}
