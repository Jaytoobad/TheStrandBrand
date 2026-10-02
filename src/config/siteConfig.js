// ============================================================================
// SITE CONFIG — the single place to edit public business information.
// Nothing secret lives here (this file ships to the browser). Update these
// values and every page that references them updates automatically.
// ============================================================================

export const siteConfig = {
  brandName: 'TheStrandBrand',
  tagline: 'Hi Beautiful, Your Signature Look Starts Here!',

  // --- Contact / social ---
  // WhatsApp: digits only, country code first, no + or spaces
  whatsappNumber: '233541988028',
  whatsappDisplay: '054 198 8028',
  // Phone calls: same format
  phoneNumber: '233543022208',
  phoneDisplay: '054 302 2208',
  contactEmail: 'abigaillartey99@icloud.com',
  instagramUrl: 'https://instagram.com/thestrandbrand', // TODO: replace with the real Instagram handle
  tiktokUrl: 'https://tiktok.com/@the.strandbrand',
  snapchatUrl: 'https://snapchat.com/add/the.strandbrand',

  currency: 'GHS',
  currencySymbol: 'GH₵',

  announcementBar: 'Premium Wigs • Quality You Can Trust • Delivered To Your Door',
  // Shorter line shown on phones so the bar stays on one line
  announcementBarShort: 'Premium Wigs • Delivered To Your Door',

  // Delivery fees are per region and edited in Admin → Settings
  // (database table `delivery_rates`). Fallback values: src/config/delivery.js

  // --- Hero slides — replace image with your own uploaded/hosted image URLs ---
  heroSlides: [
    {
      image: '/assets/hero-placeholder-1.png',
      heading: 'HI BEAUTIFUL, YOUR SIGNATURE LOOK STARTS HERE!',
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

export function formatCategoryName(name) {
  return String(name || '').replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// "out_for_delivery" -> "out for delivery" (replaces every underscore, not just the first)
export function formatOrderStatus(status) {
  return String(status || '').replace(/_/g, ' ');
}

export function getPublicSiteUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configuredUrl) return configuredUrl;
  // Fall back instead of throwing so password reset keeps working if the env var is missing.
  if (import.meta.env.PROD) console.warn('VITE_PUBLIC_SITE_URL is not set; falling back to the current origin.');
  return window.location.origin;
}

export function whatsappUrl(message = siteConfig.whatsappMessage) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// Pre-filled WhatsApp message so the team sees the order number straight away
export function orderHelpWhatsappUrl(orderNumber) {
  return whatsappUrl(`Hi ${siteConfig.brandName}, I need help with my order ${orderNumber}.`);
}

export function telUrl() {
  return `tel:+${siteConfig.phoneNumber}`;
}