/* Network-first for same-origin app assets; cache fallback allows offline billing.
   Existing invoices remain in the browser's IndexedDB (not the SW cache). */
'use strict';
const CACHE_NAME = 'ae-billing-v3-modular';
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=2.0",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/base.css",
  "./css/layout.css",
  "./css/dashboard.css",
  "./css/invoice-forms.css",
  "./css/history-customers.css",
  "./css/feedback.css",
  "./css/responsive.css",
  "./css/theme.css",
  "./css/wizard.css",
  "./css/payment.css",
  "./css/preview.css",
  "./css/wizard-responsive.css",
  "./js/bootstrap.js",
  "./js/state.js",
  "./js/database.js",
  "./js/utils.js",
  "./js/billing.js",
  "./js/repository.js",
  "./js/ranges.js",
  "./js/invoice.js",
  "./js/render.js",
  "./js/payments.js",
  "./js/backup.js",
  "./js/wizard.js",
  "./js/events.js",
  "./partials/header.html",
  "./partials/dashboard.html",
  "./partials/invoice.html",
  "./partials/history.html",
  "./partials/customers.html",
  "./partials/footer.html",
  "./partials/bottom-nav.html",
  "./partials/payment-dialog.html",
  "./partials/invoice/customer.html",
  "./partials/invoice/items.html",
  "./partials/invoice/payment.html",
  "./partials/invoice/preview.html"
];
const ASSET_PATHS = new Set(APP_ASSETS.map(path => new URL(path, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ae-billing-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !ASSET_PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) await cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (error) {
      const cached = await cache.match(request, {ignoreSearch:true});
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
