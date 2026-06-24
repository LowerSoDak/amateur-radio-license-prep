const CACHE_NAME = "amateur-radio-prep-topo-about-v4";
const ASSETS = ["./","./index.html","./style.css","./app.js","./questions.js","./sw.js","./manifest.webmanifest","./icon.svg","./topo-background.svg"];
self.addEventListener("install", e => {e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate", e => {e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))));self.clients.claim();});
self.addEventListener("fetch", e => {e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {const copy = resp.clone();caches.open(CACHE_NAME).then(c => c.put(e.request, copy));return resp;}).catch(() => cached)));});
