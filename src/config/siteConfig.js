// ============================================================================
// SITE CONFIG — the single place to edit public business information.
// Nothing secret lives here (this file ships to the browser). Update these
// values and every page that references them updates automatically.
// ============================================================================

export const siteConfig = {
  brandName: 'TheStrandBrand',
  tagline: 'Your Hair. Your Crown.',

  // --- Contact / social — REPLACE THESE with the real business details ---
  whatsappNumber: '233000000000', // digits only, country code first, no + or spaces
  contactEmail: 'hello@thestrandbrand.com',
  instagramUrl: 'https://instagram.com/thestrandbrand',
  tiktokUrl: 'https://tiktok.com/@thestrandbrand',
  snapchatUrl: 'https://snapchat.com/add/thestrandbrand',

  currency: 'GHS',
  currencySymbol: 'GH₵',

  announcementBar: 'Premium Wigs • Quality You Can Trust • Delivered To Your Door',

  // Flat delivery fee used at checkout until you wire up per-region rates.
  defaultDeliveryFee: 30,

  // --- Hero slides — replace image with your own uploaded/hosted image URLs ---
  heroSlides: [
    {
      image: '/assets/hero-placeholder-1.jpg',
      heading: 'YOUR HAIR. YOUR CROWN.',
      subheading: 'Discover beautiful wigs designed to complement your style.',
      primaryCta: { label: 'Shop Wigs', href: '/shop' },
      secondaryCta: { label: 'Explore Collection', href: '/shop?filter=collections' },
    },
    {
      image: '/assets/hero-placeholder-2.jpg',
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
