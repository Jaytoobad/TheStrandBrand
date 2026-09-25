import { siteConfig, whatsappUrl } from '../config/siteConfig';
import usePageMeta from '../hooks/usePageMeta';

export default function Contact() {
  usePageMeta('Contact', 'Get in touch with us for any inquiries or assistance.');

  return (
    <div className="container section content-page">
      <h1>Contact Us</h1>
      <p>We'd love to hear from you. Reach out through any of the channels below.</p>

      <div className="contact-grid">
        <a href={whatsappUrl()} target="_blank" rel="noreferrer" className="contact-card card">
          <h3>WhatsApp</h3>
          <p>Chat with us for quick answers about products and orders.</p>
        </a>
        <a href={`mailto:${siteConfig.contactEmail}`} className="contact-card card">
          <h3>Email</h3>
          <p>{siteConfig.contactEmail}</p>
        </a>
        <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer" className="contact-card card">
          <h3>Instagram</h3>
          <p>Follow us for new arrivals and styling inspiration.</p>
        </a>
      </div>
    </div>
  );
}
