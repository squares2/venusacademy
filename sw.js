// ═══════════════════════════════════════════════════
//  VENUS GYM — Service Worker (PWA)
// ═══════════════════════════════════════════════════

const CACHE_NAME = 'venus-gym-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.webp',
  '/assets/icon-512.webp',
  '/styles/main.css',
  '/styles/auth.css',
  '/styles/modals.css',
  '/styles/modules.css',
  '/scripts/firebase-config.js',
  '/scripts/utils.js',
  '/scripts/subscribers.js',
  '/scripts/modules-a.js',
  '/scripts/modules-b.js',
  '/scripts/app.js',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for app files, skip Firebase
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and all Firebase/CDN requests
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('firebase')) return;
  if (url.hostname.includes('fonts.g')) return;
  if (url.hostname.includes('jsdelivr.net')) return;

  // Network-first: always try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache the fresh response
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline fallback)
        return caches.match(event.request);
      })
  );
});