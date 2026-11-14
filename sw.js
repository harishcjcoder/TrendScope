// sw.js - TrendScope Minimal Offline Service Worker
const CACHE_NAME = "trendscope-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./trendscope-engine.mjs",
  "./data/cases/manifest.json",
  "./data/cases/chennai-t2m.json",
  "./data/cases/jaipur-prectotcorr.json",
  "./data/cases/manaus-t2m.json",
  "./data/cases/svalbard-t2m.json",
  "./data/grid/india-grid.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("SW: Caching partial asset set:", err.message);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Always allow live NASA POWER API calls through network
  if (event.request.url.includes("power.larc.nasa.gov") || event.request.url.includes(".netlify/functions/power")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
