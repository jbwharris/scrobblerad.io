const SCROBBLERADIO_CACHE = "app-v2.2";  // Updated cache version
const staticPlayer = SCROBBLERADIO_CACHE;
const assets = [
  "/",
  "/css/style.css",
  "/js/main-dist.js",
  "/js/stations-dist.js",
  "/img/defaultArt.png",
];

// Install event: Caches the assets
self.addEventListener("install", (installEvent) => {
  installEvent.waitUntil(
    caches.open(staticPlayer).then((cache) => {
      console.log("Caching assets");
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();  // Forces the new SW to activate immediately
});

// Activate event: Cleans up old caches
self.addEventListener("activate", (activateEvent) => {
  activateEvent.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== staticPlayer) {
            console.log("Deleting old cache:", cache);
            return caches.delete(cache);  // Delete old caches
          }
        })
      );
    })
  );
  self.clients.claim();  // Immediately start controlling any open pages
});

// Fetch event: Use Stale-While-Revalidate strategy
self.addEventListener("fetch", (fetchEvent) => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then((cachedResponse) => {
      const networkFetch = fetch(fetchEvent.request).then((networkResponse) => {
        return caches.open(staticPlayer).then((cache) => {
          cache.put(fetchEvent.request, networkResponse.clone());  // Update cache
          return networkResponse;
        });
      });
      return cachedResponse || networkFetch;
    })
  );
});
