import posthog from 'posthog-js';

const projectToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(projectToken && apiHost);

export function getPostHogHeaders() {
  if (!isPostHogConfigured) return {};

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

  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: '2026-01-30',
  });
}

export default posthog;
