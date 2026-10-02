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
