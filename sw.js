// ═══════════════════════════════════════════════════
//  VENUS GYM — Service Worker (PWA)
// ═══════════════════════════════════════════════════

// The version lives in version.js (bump it there only). The browser re-checks
// imported scripts for changes, so a new version.js also installs a new worker.
importScripts('./version.js');
const CACHE_NAME = 'venus-gym-v' + self.APP_VERSION;

const STATIC_ASSETS = [
  './',
  './index.html',
  './version.js',
  './manifest.json',
  './assets/icon-192.webp',
  './assets/icon-512.webp',
  './assets/flags.webp',
  './styles/main.css',
  './styles/auth.css',
  './styles/modals.css',
  './styles/modules.css',
  './scripts/firebase-config.js',
  './scripts/utils.js',
  './scripts/phone.js',
  './scripts/netguard.js',
  './scripts/course.js',
  './scripts/backup.js',
  './scripts/whatsapp.js',
  './scripts/subscribers.js',
  './scripts/modules-a.js',
  './scripts/modules-b.js',
  './scripts/app.js',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    // cache:'reload' → always take fresh copies from the server, never the browser's HTTP cache
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS.map(u => new Request(u, { cache: 'reload' }))))
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
  if (url.origin !== self.location.origin) return;
  // The page's "is there a newer version?" check must always reach the server
  if (url.searchParams.has('vcheck')) return;

  // Network-first with a time limit: on a weak line, don't leave the app
  // hanging — after NET_TIMEOUT serve the cached copy and let the network
  // response refresh the cache in the background.
  const NET_TIMEOUT = 3500;
  event.respondWith((async () => {
    // 'no-cache' → revalidate with the server (a tiny 304 when nothing changed),
    // so an old copy in the browser's HTTP cache can never be served as "new".
    const fresh = event.request.mode === 'navigate'
      ? fetch(event.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      : fetch(new Request(event.request, { cache: 'no-cache' }));
    const network = fresh.then(response => {
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