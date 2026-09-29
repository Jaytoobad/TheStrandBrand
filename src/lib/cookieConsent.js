export const COOKIE_CONSENT_KEY = 'tsb_cookie_consent';
export const COOKIE_SETTINGS_EVENT = 'tsb:open-cookie-settings';

let consentOverride;

export function getCookieConsent() {
  if (consentOverride !== undefined) return consentOverride;
  try {
    const choice = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return choice === 'accepted' || choice === 'rejected' ? choice : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(choice) {
  consentOverride = choice;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
  } catch {
    // Keep the choice for this page view if browser storage is unavailable.
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsent() === 'accepted';
}
