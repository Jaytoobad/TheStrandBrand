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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
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
