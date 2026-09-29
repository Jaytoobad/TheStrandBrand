import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function PrivacyPolicy() {
  usePageMeta('Privacy Policy', 'How TheStrandBrand handles account, order, delivery, and optional analytics information.');

  return (
    <div className="container section content-page">
      <h1>Privacy Policy</h1>
      <p>Last updated 28 September 2026.</p>

      <h2>Information we use</h2>
      <p>When you create an account or place an order, we use the details you provide, including your name, email address, phone number, delivery address, order items, and payment status. We use this information to manage your account, prepare and deliver orders, provide support, and maintain required business records.</p>

      <h2>Service providers</h2>
      <p>Supabase provides account, database, and file storage services. Paystack processes payments. PostHog analytics is off unless you accept optional analytics in the cookie banner. If enabled, it receives page views and explicit store events, which may include pseudonymous account or order identifiers. We do not send your name, email address, or phone number to PostHog.</p>
      <p>Payment card details are entered with Paystack. TheStrandBrand does not store full card numbers or security codes.</p>

      <h2>Storage and retention</h2>
      <p>Your cart, sign-in session, and cookie choice may be stored in your browser. Order and account records are kept for as long as needed to provide the service, meet applicable record-keeping requirements, and resolve disputes.</p>

      <h2>Your choices and requests</h2>
      <p>You can reject or withdraw optional analytics at any time through <Link to="/cookie-policy">Cookie Settings</Link>. To ask about, correct, or request deletion of personal information, contact us through the <Link to="/contact">Contact page</Link>. Some order records may need to be retained where required for business or legal purposes.</p>

      <p>For information about Ghana's data protection regulator, visit the <a href="https://dataprotection.org.gh/" target="_blank" rel="noreferrer">Data Protection Commission</a>.</p>
    </div>
  );
}
