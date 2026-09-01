// =========================================================================
// OmniSign AI — Service Worker v2.0
// 100% Offline PWA with Stale-While-Revalidate + Cache-First strategies
// =========================================================================

const CACHE_NAME = 'omnisign-v2';
const STATIC_ASSETS = [
  '/',
  '/static/index.html',
  '/static/style.css',
  '/static/app.js',
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png'
];

const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
];

// ─── Install: Pre-cache all critical assets ───
self.addEventListener('install', event => {
  console.log('[OmniSign SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[OmniSign SW] Pre-caching static assets');
      // Cache local assets (guaranteed)
      const localPromise = cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[OmniSign SW] Some local assets failed to cache:', err);
      });
      // Cache CDN assets (best-effort, may fail offline)
      const cdnPromise = Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(resp => {
              if (resp.ok) return cache.put(url, resp);
            })
            .catch(() => console.warn('[OmniSign SW] CDN cache miss:', url))
        )
      );
      return Promise.all([localPromise, cdnPromise]);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean up old caches ───
self.addEventListener('activate', event => {
  console.log('[OmniSign SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[OmniSign SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: Stale-While-Revalidate for HTML/JS/CSS, Cache-First for CDN ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST to API, WebSocket, etc.)
  if (event.request.method !== 'GET') return;

  // Skip WebSocket and API requests
  if (url.pathname.startsWith('/ws/') || url.pathname.startsWith('/api/')) return;

  // Strategy: Cache-First for CDN assets (rarely change)
  if (!url.origin.includes(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Return offline fallback if nothing cached
          return new Response('Offline – asset unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // Strategy: Stale-While-Revalidate for local assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Network failed – return cached or offline fallback
        if (cached) return cached;
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });

      // Return cached immediately, update in background
      return cached || fetchPromise;
    })
  );
});

// ─── Background Sync stub (for future API queue) ───
self.addEventListener('sync', event => {
  if (event.tag === 'omnisign-sync') {
    console.log('[OmniSign SW] Background sync triggered');
  }
});

console.log('[OmniSign SW] Service Worker loaded');
