// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/offlineInit'; // Phase 4B: Initialize offline action handlers
import { initGlobalErrorHandlers } from './lib/globalErrorHandlers'; // Phase 11: Initialize global error handlers

// 👉 Import Supabase and expose it for debugging
import { supabase } from './lib/supabase';

// Make Supabase available in browser devtools:
// Run: supabase.auth.getUser().then(console.log)
(window as any).supabase = supabase;

// Phase 2A: Mobile Safety - Global input focus scroll handler
// Ensures inputs scroll into view when focused on mobile to prevent keyboard covering
document.addEventListener('focusin', (e: FocusEvent) => {
  const target = e.target as HTMLElement;
  if (
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
    target.type !== 'hidden' &&
    !target.closest('[data-no-scroll-on-focus]') // Allow opt-out
  ) {
    // Small delay to allow keyboard animation on mobile
    setTimeout(() => {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 300);
  }
});

// Phase 8: Global error handlers for chunk load errors
import { handleChunkLoadError } from './lib/serviceWorkerRecovery';

// Phase 8: Handle chunk load errors globally
window.addEventListener('error', (event) => {
  if (event.error) {
    const handled = handleChunkLoadError(event.error);
    if (handled) {
      event.preventDefault(); // Prevent default error handling
    }
  }
});

// Phase 8: Handle unhandled promise rejections (chunk load errors often appear here)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason instanceof Error) {
    const handled = handleChunkLoadError(event.reason);
    if (handled) {
      event.preventDefault(); // Prevent default error handling
    }
  }
});

// Phase 3A: Register Service Worker (Production Only)
// Phase 3C: Enhanced with update handling
// Phase 8: Enhanced with recovery detection
// Service worker is disabled in dev to avoid caching issues during development
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Phase 3C: Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Phase 3C: Handle service worker updates
        // Phase 8: Don't auto-reload, let boot system handle it
        // Phase 9: Enhanced update detection for in-app update banner
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Phase 9: Signal update available - service worker is waiting
                // The update banner will show and allow user to confirm
                window.dispatchEvent(new CustomEvent('sw-update-available', {
                  detail: { waiting: true }
                }));
              }
            });
          }
        });

        // Phase 9: Check for waiting service worker on registration
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('sw-update-available', {
            detail: { waiting: true }
          }));
        }
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
        // Phase 8: Signal service worker error to boot system
        window.dispatchEvent(new CustomEvent('sw-registration-failed', { detail: error }));
      });
  });
}

// Phase 3A: Detect Standalone Mode
// Phase 3B: Use centralized app context detection
// Phase 3C: Enhanced visual identity
import { isStandaloneApp } from './lib/appContext';
import { preventInstallPromptInApp } from './lib/installPrompt';
// Phase 8B: Pull-to-refresh guard for installed PWA
import { initPullToRefreshGuard } from './lib/pullToRefreshGuard';

// Phase 3C: Add standalone mode class for styling
if (isStandaloneApp()) {
  document.documentElement.classList.add('standalone-mode');
  // Phase 3C: Prevent any install prompts in installed app
  preventInstallPromptInApp();
  // Phase 8B: Initialize pull-to-refresh guard
  initPullToRefreshGuard();
}

// Phase 11: Initialize global error handlers for mobile debugging
initGlobalErrorHandlers();

// ---- Mount App ----
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("❌ Root element #root not found in index.html");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
