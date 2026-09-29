import usePageMeta from '../hooks/usePageMeta';
import { Link, useLocation } from 'react-router-dom';
const faqs = [
  { q: 'What does made to order mean?', a: 'Your wig is prepared after your preorder is confirmed and is made to your selected specifications.' },
  { q: 'How long will my order take?', id: 'delivery', a: 'Allow about 7 days for preparation and 2 to 3 days for delivery. The estimated total is 9 to 10 days.' },
  { q: 'How much is delivery?', a: 'The delivery fee depends on your region. Greater Accra costs the least, and your exact fee is shown at checkout as soon as you pick your region, before you pay.' },
  { q: 'What should I confirm before paying?', a: 'Check your length, colour, density, lace type, style, and any other selected specifications before placing your order.' },
  { q: 'Can I cancel or get a refund after ordering?', id: 'returns', a: 'Preordered and custom made hair orders are non refundable once payment is made and the order is confirmed. Supplier, shipping, or customs delays do not qualify for a refund.', policyLink: true },
  { q: 'What should I do when my order arrives?', a: 'Record a clear unboxing video before opening or handling the hair. Check your order during unboxing and contact us immediately if anything is wrong.' },
  { q: 'Can I request a return or exchange?', a: 'Report any problem within 24 hours of delivery. Do not cut or alter lace, wash, bleach, dye, pluck, style, wear, or otherwise alter the hair before reporting the issue.', policyLink: true },
  { q: 'How do I track my order?', a: 'Use the Track Order page with your order number and the email or phone number used at checkout. Signed in customers can also view orders in My Account.' },
  { q: 'Which payment methods do you accept?', a: 'Pay securely by card or Mobile Money through Paystack.' },
  { q: 'How can I contact the team?', a: 'Reach us through WhatsApp, by phone, or by email from the Contact page.' },
];

export default function FAQ() {
   usePageMeta('FAQ', 'Answers to common questions about ordering, delivery, and returns.');
   const location = useLocation(); const activeId = location.hash.replace('#', '');
  return (
    <div className="container section content-page">
      <h1>Frequently Asked Questions</h1>
      <div className="faq-list">
        {faqs.map((f) => (
         <details key={f.q} id={f.id} open={f.id === activeId ? true : undefined} className="faq-item">
          <summary>{f.q}</summary>
            <p>{f.a} {f.policyLink && <Link to="/refund-policy">Read the full Refund &amp; Return Policy.</Link>}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
