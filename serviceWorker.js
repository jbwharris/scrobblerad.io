const staticPlayer = "scrobblerad.io"
const assets = [
  "/",
  "/css/style.css",
  "/js/main-dist.js",
  "/js/stations-dist.js",
  "/img/defaultArt.png",
]

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(staticPlayer).then(cache => {
      cache.addAll(assets)
    })
  )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
      caches.match(fetchEvent.request).then(res => {
        return res || fetch(fetchEvent.request)
      })
    )
  })
  