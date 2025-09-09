const SCROBBLERADIO_CACHE = "app-v3.788";  // Updated cache version
const staticPlayer = SCROBBLERADIO_CACHE;
const assets = [
  "/",
  "/css/style.css",
  "/js/main-dist.js",
  "/js/stations-dist.js",
  "/js/scrobbler.js",
  "/img/defaultArt.png",
  "/css/external/bootstrap.min.css",
  "/js/external/bootstrap.min.js",
  "/js/external/filter.min.js"
];

// Function to check for updates
function checkForUpdates() {
  caches.open(staticPlayer).then((cache) => {
    cache.match("/").then((response) => {
      if (!response) {
        alert("A new version of the app is available. Please refresh to update.");
      }
    });
  });
}

// Install event: Cache the assets
self.addEventListener("install", (installEvent) => {
  installEvent.waitUntil(
    caches.open(staticPlayer).then((cache) => {
      console.log("Caching assets");
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();  // Forces the new SW to activate immediately
});

// Activate event: Clean up old caches and notify clients of updates
self.addEventListener("activate", (activateEvent) => {
  activateEvent.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== staticPlayer) {
              console.log("Deleting old cache:", cache);
              return caches.delete(cache);
            }
          })
        );
      }),
      // Notify clients that a new version is available
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ action: "new_version_available" });
        });
      })
    ])
  );
  self.clients.claim();  // Immediately start controlling any open pages
});

// Fetch event: Cache-first strategy with network fallback
self.addEventListener("fetch", (fetchEvent) => {
  const request = fetchEvent.request;
  const url = new URL(request.url);

  // Bypass service worker for non-GET requests and external resources
  if (request.method !== "GET" || !url.origin.startsWith(self.location.origin)) {
    return fetch(request);
  }

  fetchEvent.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response if available, otherwise fetch from network
      const fetchPromise = fetch(request).then((fetchedResponse) => {
        // Cache the new response for future use
        if (!cachedResponse) {
          caches.open(staticPlayer).then((cache) => {
            cache.put(request, fetchedResponse.clone());
          });
        }
        return fetchedResponse;
      }).catch(() => {
        // Fallback to cached response if network fails
        return cachedResponse;
      });

      return cachedResponse ? cachedResponse : fetchPromise;
    })
  );
});

// Optional: Handle update notifications in the main app
if (typeof window !== 'undefined') {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.action === "new_version_available") {
      alert("A new version of the app is available. Please refresh to update.");
    }
  });

  // Check for updates every 24 hours
  setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
}
