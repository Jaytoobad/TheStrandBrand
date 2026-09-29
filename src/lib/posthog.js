import posthog from 'posthog-js';
import { hasAnalyticsConsent } from './cookieConsent';

const projectToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(projectToken && apiHost);
let initialized = false;

export function canCapturePostHog() {
  return isPostHogConfigured && initialized && hasAnalyticsConsent();
}

export function getPostHogHeaders() {
  if (!canCapturePostHog()) return {};

  return {
    'X-POSTHOG-DISTINCT-ID': posthog.get_distinct_id(),
    'X-POSTHOG-SESSION-ID': posthog.get_session_id(),
  };
}

export function initializePostHog() {
  if (!projectToken && import.meta.env.DEV) {
    throw new Error('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is configured');
  }
  if (!apiHost && import.meta.env.DEV) {
    throw new Error('VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured');
  }
  if (!isPostHogConfigured) return;
  if (!hasAnalyticsConsent()) {
    disablePostHog();
    return;
  }

  if (initialized) {
    posthog.opt_in_capturing({ captureEventName: false });
    return;
  }

  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: '2026-01-30',
    autocapture: false,
  });
  initialized = true;
}

export function disablePostHog() {
  if (initialized) posthog.opt_out_capturing();

  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
      keys.filter((key) => key?.startsWith('ph_')).forEach((key) => storage.removeItem(key));
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }

  try {
    document.cookie.split(';').forEach((entry) => {
      const name = entry.split('=')[0].trim();
      if (name.startsWith('ph_')) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  } catch {
    // Cookie access can be unavailable in restricted browser contexts.
  }
}

export default posthog;
