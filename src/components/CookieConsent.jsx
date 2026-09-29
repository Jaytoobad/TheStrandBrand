import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import posthog, { canCapturePostHog, disablePostHog, initializePostHog } from '../lib/posthog';
import { COOKIE_SETTINGS_EVENT, getCookieConsent, setCookieConsent } from '../lib/cookieConsent';

export default function CookieConsent() {
  const [open, setOpen] = useState(() => getCookieConsent() === null);
  const { user } = useAuth();

  useEffect(() => {
    function openSettings() {
      setOpen(true);
    }
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  function chooseConsent(nextChoice) {
    setCookieConsent(nextChoice);
    setOpen(false);

    if (nextChoice === 'accepted') {
      initializePostHog();
      // Pseudonymous ID only — the Privacy Policy promises no name/email/phone goes to PostHog.
      if (user && canCapturePostHog()) posthog.identify(user.id);
    } else {
      disablePostHog();
    }
  }

  if (!open) return null;

  return (
    <section className="cookie-consent" role="region" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent-copy">
        <h2 id="cookie-consent-title">Your privacy choices</h2>
        <p>Essential storage keeps your cart and sign-in working. With your permission, analytics helps us improve the store. You can change your choice at any time.</p>
        <Link to="/cookie-policy">Read our Cookie Policy</Link>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="btn btn-outline" onClick={() => chooseConsent('rejected')}>Reject optional</button>
        <button type="button" className="btn btn-primary" onClick={() => chooseConsent('accepted')}>Accept analytics</button>
      </div>
    </section>
  );
}
