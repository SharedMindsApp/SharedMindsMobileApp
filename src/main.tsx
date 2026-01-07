// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/offlineInit'; // Phase 4B: Initialize offline action handlers

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

// Phase 3A: Register Service Worker (Production Only)
// Phase 3C: Enhanced with update handling
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
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Phase 3C: New service worker available - reload when safe
                // Only reload if app is in foreground and not during critical operations
                if (document.visibilityState === 'visible') {
                  // Small delay to avoid interrupting user actions
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  });
}

// Phase 3A: Detect Standalone Mode
// Phase 3B: Use centralized app context detection
// Phase 3C: Enhanced visual identity
import { isStandaloneApp } from './lib/appContext';
import { preventInstallPromptInApp } from './lib/installPrompt';

// Phase 3C: Add standalone mode class for styling
if (isStandaloneApp()) {
  document.documentElement.classList.add('standalone-mode');
  // Phase 3C: Prevent any install prompts in installed app
  preventInstallPromptInApp();
}

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
