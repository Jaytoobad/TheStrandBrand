// ============================================================================
// SITE CONFIG — the single place to edit public business information.
// Nothing secret lives here (this file ships to the browser). Update these
// values and every page that references them updates automatically.
// ============================================================================

export const siteConfig = {
  brandName: 'TheStrandBrand',
  tagline: 'Your Hair. Your Crown.',

  // --- Contact / social ---
  // WhatsApp: digits only, country code first, no + or spaces
  whatsappNumber: '233541988028',
  whatsappDisplay: '054 198 8028',
  // Phone calls: same format
  phoneNumber: '233543022208',
  phoneDisplay: '054 302 2208',
  contactEmail: 'hello@thestrandbrand.com', // TODO: replace with the real business email
  instagramUrl: 'https://instagram.com/thestrandbrand', // TODO: replace with the real Instagram handle
  tiktokUrl: 'https://tiktok.com/@the.strandbrand',
  snapchatUrl: 'https://snapchat.com/add/the.strandbrand',

  currency: 'GHS',
  currencySymbol: 'GH₵',

  announcementBar: 'Premium Wigs • Quality You Can Trust • Delivered To Your Door',

  // Flat delivery fee used at checkout until you wire up per-region rates.
  defaultDeliveryFee: 30,

  // --- Hero slides — replace image with your own uploaded/hosted image URLs ---
  heroSlides: [
    {
      image: '/assets/hero-placeholder-1.png',
      heading: 'YOUR HAIR. YOUR CROWN.',
      subheading: 'Discover beautiful wigs designed to complement your style.',
      primaryCta: { label: 'Shop Wigs', href: '/shop' },
      secondaryCta: { label: 'Explore Collection', href: '/shop?filter=collections' },
    },
    {
      image: '/assets/hero-placeholder-2.png',
      heading: 'FIND A STYLE THAT FEELS LIKE YOU.',
      subheading: 'Quality strands. Effortless confidence.',
      primaryCta: { label: 'New Arrivals', href: '/shop?filter=new' },
      secondaryCta: { label: 'Best Sellers', href: '/shop?filter=bestsellers' },
    },
  ],

  whatsappMessage: "Hi TheStrandBrand! I'd like to ask about your wigs.",
};

export function formatMoney(amount) {
  return `${siteConfig.currencySymbol}${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function whatsappUrl(message = siteConfig.whatsappMessage) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function telUrl() {
  return `tel:+${siteConfig.phoneNumber}`;
}