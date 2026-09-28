import { siteConfig, whatsappUrl, telUrl } from '../config/siteConfig';
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
          <p>Chat with us on {siteConfig.whatsappDisplay} for quick answers about products and orders.</p>
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        <a href={telUrl()} className="contact-card card">
          <h3>Call</h3>
          <p>{siteConfig.phoneDisplay}</p>
          <span className="visually-hidden">(opens your phone app)</span>
        </a>
        <a href={`mailto:${siteConfig.contactEmail}`} className="contact-card card">
          <h3>Email</h3>
          <p>{siteConfig.contactEmail}</p>
          <span className="visually-hidden">(opens your email app)</span>
        </a>
        <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer" className="contact-card card">
          <h3>Instagram</h3>
          <p>Follow us for new arrivals and styling inspiration.</p>
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}