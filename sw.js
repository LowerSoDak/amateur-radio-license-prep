const CACHE_NAME = "amateur-radio-prep-v3.0.1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./questions.js",
  "./sw.js",
  "./manifest.webmanifest",
  "./topo-background.svg",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-1024.png",
  "./maskable-512.png",
  "./figures/e5-1.png",
  "./figures/e6-1.png",
  "./figures/e6-2.png",
  "./figures/e6-3.png",
  "./figures/e7-1.png",
  "./figures/e7-2.png",
  "./figures/e7-3.png",
  "./figures/e9-1.png",
  "./figures/e9-2.png",
  "./figures/e9-3.png",
  "./figures/g7-1.png",
  "./figures/t-1.png",
  "./figures/t-2.png",
  "./figures/t-3.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
