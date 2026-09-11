// =========================================================================
// OmniSign AI — Service Worker v2.0
// 100% Offline PWA with Stale-While-Revalidate + Cache-First strategies
// =========================================================================

const CACHE_NAME = 'omnisign-v2.10';
const STATIC_ASSETS = [
  '/',
  '/static/index.html',
  '/static/style.css',
  '/static/app.js',
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png',
  // Self-hosted MediaPipe pipeline (hands model runs fully offline)
  '/static/mediapipe/camera_utils/camera_utils.js',
  '/static/mediapipe/control_utils/control_utils.js',
  '/static/mediapipe/drawing_utils/drawing_utils.js',
  '/static/mediapipe/hands/hands.js',
  '/static/mediapipe/hands/hands.binarypb',
  '/static/mediapipe/hands/hands_solution_packed_assets_loader.js',
  '/static/mediapipe/hands/hands_solution_simd_wasm_bin.js',
  '/static/mediapipe/hands/hands_solution_simd_wasm_bin.data',
  '/static/vendor/lucide.js'
];

// Heavy binaries cached lazily on first fetch (cache-first strategy below)
const HEAVY_MEDIAPIPE_ASSETS = [
  '/static/mediapipe/hands/hands_solution_simd_wasm_bin.wasm',
  '/static/mediapipe/hands/hands_solution_packed_assets.data',
  '/static/mediapipe/hands/hand_landmark_full.tflite',
  '/static/mediapipe/hands/hand_landmark_lite.tflite'
];

// ─── Install: Pre-cache all critical assets ───
self.addEventListener('install', event => {
  console.log('[OmniSign SW] Installing v2.10...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[OmniSign SW] Some local assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean up old caches ───
self.addEventListener('activate', event => {
  console.log('[OmniSign SW] Activating v2.10...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[OmniSign SW] Purging obsolete cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: Network-First for core App scripts/styles, Cache-First for static media ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip WebSocket and API requests
  if (url.pathname.startsWith('/ws/') || url.pathname.startsWith('/api/')) return;

  // Network-First for local JS, CSS and HTML documents to ensure instant updates
  if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First for media assets, heavy model binaries & remaining dependencies.
  // Heavy MediaPipe binaries (.wasm/.data/.tflite) are fetched once and cached for offline use.
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
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
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
