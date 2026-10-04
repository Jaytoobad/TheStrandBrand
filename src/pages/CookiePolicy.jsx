import usePageMeta from '../hooks/usePageMeta';
import { COOKIE_SETTINGS_EVENT } from '../lib/cookieConsent';

export default function CookiePolicy() {
  usePageMeta('Cookie Policy', 'Learn how TheStrandBrand uses essential browser storage and optional analytics.');

  function openCookieSettings() {
    window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
  }

  return (
    <div className="container section content-page">
      <h1>Cookie Policy</h1>
      <p>Last updated 4 October 2026.</p>
      <p>This policy explains the browser storage used by TheStrandBrand and how you can choose whether to allow optional analytics.</p>

      <h2>Essential storage</h2>
      <p>We use browser storage to remember your cart, keep your signed-in session active, and remember your cookie choice. These functions are needed for the shop to work.</p>

      <h2>Optional analytics</h2>
      <p>PostHog analytics stays off until you accept. If enabled, it may use cookies or local storage to measure page visits and the store's explicit product, account, and checkout events. Signed-in activity may be associated with a pseudonymous account identifier. We do not use advertising cookies.</p>

      <h2>Error logging</h2>
      <p>
        If a page fails to work, we record the error message, a technical stack
        trace and the page path in our own database so we can fix it. This is not
        optional analytics and cannot be switched off, because it is what lets us
        keep the shop working. It sets no cookie, creates no identifier, does not
        record your IP address, and is not shared with any third party. If you are
        signed in, the report is linked to your account so we can trace problems
        that only affect you; if you are browsing as a visitor, the report is
        anonymous. Reports are deleted after twelve months.
      </p>

      <h2>Your choice</h2>
      <p>Your choice is saved in this browser. Accepting enables analytics; rejecting disables it and removes PostHog identifiers stored by this site. Change your choice at any time using the controls below or the Cookie Settings link in the footer. Rejecting analytics does not affect your cart or account.</p>
      <button type="button" className="btn btn-outline" onClick={openCookieSettings}>Cookie Settings</button>
    </div>
  );
}
