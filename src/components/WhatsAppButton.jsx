import { whatsappUrl } from '../config/siteConfig';
import WhatsAppIcon from './icons/WhatsAppIcon';

export default function WhatsAppButton() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-fab"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon size={26} color="#fff" />
    </a>
  );
}
