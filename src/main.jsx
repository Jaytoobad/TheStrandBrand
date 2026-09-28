import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import posthog, { initializePostHog } from './lib/posthog';
import './styles/globals.css';

initializePostHog();

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
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary fallback={<div style={{ padding: 60, textAlign: 'center' }}>Something went wrong. Please refresh the page.</div>}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>
);
