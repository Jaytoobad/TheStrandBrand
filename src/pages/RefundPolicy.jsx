import usePageMeta from '../hooks/usePageMeta';

export default function RefundPolicy() {
  usePageMeta('Refund & Return Policy', 'Read the refund, cancellation, return, and exchange terms for custom made and preordered hair.');

  return (
    <div className="container section content-page">
      <h1>Refund &amp; Return Policy</h1>
      <p>Last updated 28 September 2026.</p>

      <h2>Refund &amp; Cancellation Policy</h2>
      <p>All preordered and custom made hair orders are strictly non refundable once payment has been made and the order has been confirmed.</p>
      <p>Each custom made unit is prepared specifically to the customer's requested specifications. Cancellations or refunds cannot be accepted once production has started.</p>
      <p>Preordered hair is ordered specifically for customers. Supplier, shipping, customs, or other delays outside our control do not qualify for a refund.</p>
      <p>Before paying, confirm your length, colour, density, lace type, style, and all other specifications. Please also make sure you are comfortable with the stated waiting period.</p>

      <h2>Return &amp; Exchange Policy</h2>
      <p>Record a clear unboxing video before opening or handling the hair. This video is required as proof if there is an issue with your order.</p>
      <p>Report any problem with your hair or order immediately, within 24 hours of delivery.</p>
      <p>Before reporting an issue, do not:</p>
      <ul>
        <li>Cut or alter the lace.</li>
        <li>Wash, bleach, dye, pluck, or style the hair.</li>
        <li>Make alterations to the wig or bundles.</li>
        <li>Wear or use the hair.</li>
      </ul>
      <p>An issue reported more than 24 hours after delivery, or after the hair has been altered, worn, washed, styled, or otherwise handled, may not be accepted for return or exchange.</p>
      <p>Check your order carefully during unboxing and contact us immediately if anything is wrong.</p>

      <h2>Agreement</h2>
      <p>By placing an order, you acknowledge and agree to this policy.</p>
    </div>
  );
}
