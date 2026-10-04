import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PostHogProvider } from '@posthog/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import posthog, { initializePostHog } from './lib/posthog';
import { initErrorReporter } from './lib/errorReporter';
import './styles/globals.css';

initializePostHog();
// First-party error reporting. Registered before React mounts so an error thrown
// during the first render is still captured.
initErrorReporter();

// After a new deploy, an open tab may request a page chunk that no longer
// exists. Reload once to pick up the latest build instead of showing an error.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'chunk-reload-at';
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last > 10000) {
    event.preventDefault();
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* PostHog is retained for analytics events only. Its own error boundary is
        replaced by ErrorBoundary, which reports to our own database instead —
        PostHog's is gated behind the analytics cookie consent, so it would stay
        silent for every customer who declines analytics. */}
    <PostHogProvider client={posthog}>
      <ErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>
);