// Phase 3A: Minimal Service Worker - App Shell Only
// This service worker caches ONLY the app shell (HTML, CSS, JS bundles)
// It does NOT cache API responses, auth tokens, or any dynamic data
// This enables installability and fast shell load without offline complexity
//
// NOTE: In production, Vite builds assets with hashed filenames (e.g., index-abc123.js)
// The service worker will cache these automatically when they are requested.
// We don't need to pre-cache specific filenames since they change with each build.

// Phase 3C: Cache versioning for clean updates
const CACHE_NAME = 'shared-minds-shell-v2';
// Shell files to pre-cache (static assets that don't change)
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Phase 3A: Install - Cache app shell only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only cache shell files, not API responses
      return cache.addAll(SHELL_FILES).catch((err) => {
        // If any file fails to cache, log but don't fail installation
        console.warn('Service worker: Some shell files failed to cache', err);
      });
    })
  );
  // Activate immediately to avoid waiting for all tabs to close
  self.skipWaiting();
});

// Phase 3A: Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Phase 3A: Fetch - Network-first for everything, fallback to cache for shell only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests or auth endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('vercel') ||
    request.method !== 'GET'
  ) {
    // Always go to network for API/auth, no caching
    return;
  }

  // For shell files (HTML, CSS, JS), try network first, fallback to cache
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If network succeeds, cache the response for future use
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, return a basic offline page (optional)
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
  // For all other requests (images, fonts, etc.), use network only, no caching
});

