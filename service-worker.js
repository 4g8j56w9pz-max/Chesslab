const CACHE_NAME = "midnight-games-v10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./chesslab.html",
  "./games/water-sort/",
  "./games/water-sort/index.html",
  "./games/water-sort/water-sort.css",
  "./games/water-sort/water-sort.js",
  "./games/lock-pop/",
  "./games/lock-pop/index.html",
  "./games/lock-pop/styles.css",
  "./games/lock-pop/assets/favicon.svg",
  "./games/lock-pop/src/main.js",
  "./games/lock-pop/src/game-engine.js",
  "./games/lock-pop/src/renderer.js",
  "./games/lock-pop/src/audio.js",
  "./games/lock-pop/src/storage.js",
  "./leaderboard-config.js",
  "./styles.css",
  "./style.css",
  "./app.js",
  "./chesslab-app.js",
  "./manifest.json",
  "./icons/midnight-icon.svg",
  "./pieces/white-pawn.png",
  "./pieces/white-rook.png",
  "./pieces/white-knight.png",
  "./pieces/white-bishop.png",
  "./pieces/white-queen.png",
  "./pieces/white-king.png",
  "./pieces/black-pawn.png",
  "./pieces/black-rook.png",
  "./pieces/black-knight.png",
  "./pieces/black-bishop.png",
  "./pieces/black-queen.png",
  "./pieces/black-king.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        const responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseCopy);
        });
        return networkResponse;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
