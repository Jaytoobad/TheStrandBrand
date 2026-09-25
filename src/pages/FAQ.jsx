import usePageMeta from '../hooks/usePageMeta';
const faqs = [
  { q: 'How do I order?', a: 'Browse the shop, add your favourite wigs to your cart, and check out securely with Paystack. You can also check out as a guest without creating an account.' },
  { q: 'What payment methods are available?', a: 'We accept card payments and Mobile Money through Paystack.' },
  { q: 'How long does delivery take?', id: 'delivery', a: 'Delivery typically takes 2–5 business days within Ghana, depending on your location.' },
  { q: 'How do I track my order?', a: 'Use the "Track Order" page with your order number and the email or phone number used at checkout, or check "My Orders" if you have an account.' },
  { q: 'Can I change my order?', a: 'Contact us as soon as possible after ordering — we can usually make changes before your order is packaged.' },
  { q: "What happens if my selected wig is out of stock?", a: "We'll notify you and offer a refund or a similar alternative style." },
  { q: 'Do you accept returns?', id: 'returns', a: 'Yes, within 48 hours of delivery for unworn, unaltered items. See our Returns & Refund Policy for details.' },
  { q: 'How do I contact customer support?', a: 'Reach us via WhatsApp using the floating button, or through our Contact page.' },
];

export default function FAQ() {
   usePageMeta('FAQ', 'Answers to common questions about ordering, delivery, and returns.');
  return (
    <div className="container section content-page">
      <h1>Frequently Asked Questions</h1>
      <div className="faq-list">
        {faqs.map((f) => (
          <details key={f.q} id={f.id} className="faq-item">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
