// Courier tracking links are typed by an admin, so they are treated as
// untrusted input on the customer-facing pages. Anything that is not a plain
// http(s) URL — a javascript:, data: or vbscript: link, for example — is
// dropped instead of rendered.
export function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'https:' || protocol === 'http:' ? value.trim() : null;
  } catch {
    return null;
  }
}

// Mirrors safePaystackUrl in supabase/functions/initialize-payment. The browser
// is about to be navigated to this URL, so it is checked again on this side
// before the customer leaves the store — if the response is missing, malformed
// or points anywhere but Paystack, checkout fails loudly and the cart is left
// intact instead of the page navigating somewhere unexpected.
export function isPaystackCheckoutUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const { protocol, hostname } = new URL(value.trim());
    return protocol === 'https:' && /(^|\.)paystack\.com$/.test(hostname);
  } catch {
    return false;
  }
}
