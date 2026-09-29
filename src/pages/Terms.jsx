import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function Terms() {
  usePageMeta('Terms & Conditions', 'Terms for ordering custom made wigs from TheStrandBrand.');

  return (
    <div className="container section content-page">
      <h1>Terms &amp; Conditions</h1>
      <p>Last updated 28 September 2026.</p>

      <h2>Orders and payment</h2>
      <p>Prices are shown in Ghanaian Cedis. Any delivery fee is displayed in your order summary before payment. An order is confirmed after payment has been verified. Product availability is shown on each product page.</p>

      <h2>Custom made and preorder timing</h2>
      <p>Wigs marked as available to preorder are made after the order is confirmed. Allow about 7 days for preparation, followed by 2 to 3 days for delivery. The expected total is about 9 to 10 days. These are estimates, not a guaranteed delivery date.</p>

      <h2>Refunds, cancellations, and returns</h2>
      <p>Preorders and custom made hair orders are non refundable after payment and confirmation. For return or exchange requests, follow the <Link to="/refund-policy">Refund &amp; Return Policy</Link>.</p>

      <h2>Changes to an order</h2>
      <p>Contact us as soon as possible through the <Link to="/contact">Contact page</Link> if you need to correct an order. Changes may not be possible after production has started.</p>

      <h2>Contact</h2>
      <p>Questions about an order or these terms? <Link to="/contact">Contact our team</Link>.</p>
    </div>
  );
}
