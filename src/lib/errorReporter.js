// ============================================================================
// FIRST-PARTY ERROR REPORTING
//
// Sends uncaught storefront errors to our own `error_reports` table via the
// report-error Edge Function.
//
// This is deliberately not PostHog. PostHog's error capture sits behind the
// analytics cookie consent, so a customer who declines analytics produces no
// error reports at all — the shop owner is blind to their own storefront. Here
// there is no cookie, no persistent identifier and no stored IP address: reports
// go to a database the shop owns, which makes them operational records rather
// than tracking. They are disclosed in the cookie policy rather than gated on
// consent.
//
// If the visitor is signed in, the report is attributed to that account so
// account-specific failures can be traced. Anonymous visitors stay anonymous.
// ============================================================================

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-error`;

// Same error repeatedly in one visit is one bug, not many. Reporting the first
// few and then staying quiet keeps a render loop from filling the table, and the
// server-side per-fingerprint limit is the backstop.
const MAX_REPORTS_PER_ERROR = 3;
const MAX_REPORTS_PER_SESSION = 25;

// In-memory only. Nothing about an error is written to localStorage or a cookie:
// an identifier that survives the visit would turn an error log into tracking.
const seen = new Map();
let sessionCount = 0;

// Guards against the reporter causing an error, which would recurse.
let reporting = false;

// The access token is cached by AuthContext. Reading the session inside the
// error handler would be async, and an error during unload may never get to run.
let accessToken = null;

/** Called by AuthContext so signed-in reports can be attributed to the account. */
export function setErrorReporterToken(token) {
  accessToken = token || null;
}

function report(payload) {
  if (reporting || sessionCount >= MAX_REPORTS_PER_SESSION) return;
  reporting = true;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const body = JSON.stringify(payload);

    // sendBeacon survives the page being unloaded, which is exactly when an error
    // is most likely to be reported. It cannot set headers, so the token is
    // omitted in that case and the report is simply anonymous.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', headers, body, keepalive: true }).catch(() => {});
    }
    sessionCount += 1;
  } catch {
    // Reporting must never be the thing that breaks.
  } finally {
    reporting = false;
  }
}

function record(error, context) {
  const message = String(error?.message || error || 'Unknown error').slice(0, 500);
  const stack = typeof error?.stack === 'string' ? error.stack.slice(0, 4000) : null;

  // Keyed on message plus the top frame, matching the server's fingerprint so a
  // local dedupe and a server-side dedupe agree on what "the same error" is.
  const frame = String(stack || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /https?:\/\/|\(.*:\d+:\d+\)/.test(line) || /\bat\s/.test(line));
  const key = `${message}|${frame || ''}`;

  const count = (seen.get(key) || 0) + 1;
  seen.set(key, count);
  if (count > MAX_REPORTS_PER_ERROR) return;

  report({
    message,
    stack,
    source: 'window',
    url: window.location.href,
    context: context ?? null,
  });
}

/**
 * Starts listening for uncaught errors and unhandled promise rejections.
 *
 * Off in development: a development error is usually something already on screen
 * and being in someone's face, and reporting it would put dev noise into the
 * production table.
 */
export function initErrorReporter() {
  if (!import.meta.env.VITE_SUPABASE_URL) return () => {};
  if (!import.meta.env.PROD) return () => {};

  const onError = (event) => {
    record(event.error || event.message, { source: 'window.onerror' });
  };

  const onRejection = (event) => {
    record(event.reason, { source: 'unhandledrejection' });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return function stop() {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/** Reports a caught failure that would otherwise only be visible in the console. */
export function reportError(error, context) {
  if (!import.meta.env.PROD) return;
  record(error, context);
}