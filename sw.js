// ═══════════════════════════════════════════════════
//  VENUS GYM — Service Worker (PWA)
// ═══════════════════════════════════════════════════

const CACHE_NAME = 'venus-gym-v20';

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
  '/scripts/netguard.js',
  '/scripts/course.js',
  '/scripts/backup.js',
  '/scripts/whatsapp.js',
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

  // Network-first with a time limit: on a weak line, don't leave the app
  // hanging — after NET_TIMEOUT serve the cached copy and let the network
  // response refresh the cache in the background.
  const NET_TIMEOUT = 3500;
  event.respondWith((async () => {
    const network = fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    });
    const cached = await caches.match(event.request);
    if (!cached) return network.catch(() => Response.error());
    const timeout = new Promise(resolve => setTimeout(() => resolve(cached), NET_TIMEOUT));
    return Promise.race([network.catch(() => cached), timeout]);
  })());
});