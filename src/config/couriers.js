// ============================================================================
// COURIERS — tracking link templates for the couriers used in Ghana.
//
// An external tracking URL cannot be generated here: it comes from the courier.
// What this file removes is the need to look it up and hand-assemble it for
// every single order. Each entry is the courier's own public tracking page with
// a {tracking} placeholder, so the admin picks the courier and types the
// tracking number, and the link is built for them.
//
// To add a courier: copy a real tracking URL from that courier's website, find
// the part that changes per parcel, and put {tracking} there. Keep only the
// https:// origin and path — no signing keys or tokens, because these links are
// shown to customers and stored on the order.
// ============================================================================

export const COURIERS = [
  { id: 'gig', name: 'GIG Logistics', template: 'https://giglogistics.com/track/?id={tracking}' },
  { id: 'swanlodge', name: 'SwanLODGE', template: 'https://swanlodge.com/track/{tracking}' },
  { id: 'mvp', name: 'MVP Ghana', template: 'https://mvpglobel.com/track/{tracking}' },
  { id: 'delly', name: 'Delly', template: 'https://dellyshop.com/track/{tracking}' },
  { id: 'tips', name: 'TIPS', template: 'https://www.tipsghana.com/track/{tracking}' },
  { id: 'jdsl', name: 'JDSL', template: 'https://www.jdslltd.com/track/{tracking}' },
  { id: 'redbean', name: 'RedBean', template: 'https://redbeanlogistics.com/track/{tracking}' },
  { id: 'ace', name: 'Ace Delivery', template: 'https://acedeliverygh.com/track/{tracking}' },
  { id: 'other', name: 'Other / manual', template: '' },
];

// Builds a tracking link from a template and a tracking number. Returns '' when
// either piece is missing, or when there is no template, so callers can fall
// back to showing the bare tracking number.
export function buildTrackingUrl(template, trackingNumber) {
  const tracking = String(trackingNumber || '').trim();
  if (!template || !tracking) return '';
  if (!template.includes('{tracking}')) return '';
  return template.replace('{tracking}', encodeURIComponent(tracking));
}

// Finds the courier whose name matches what the admin typed, so an order that
// already has "GIG Logistics" shows that courier preselected.
export function findCourierByName(name) {
  const typed = String(name || '').trim().toLowerCase();
  if (!typed) return null;
  return (
    COURIERS.find((c) => c.name.toLowerCase() === typed) ||
    COURIERS.find((c) => c.id === typed) ||
    COURIERS.find((c) => c.name.toLowerCase().includes(typed) || typed.includes(c.name.toLowerCase())) ||
    null
  );
}