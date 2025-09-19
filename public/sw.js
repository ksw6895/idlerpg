const CACHE_NAME = 'lumin-grove-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/phaser.js',
  '/src/main.js',
  '/src/scenes/BootScene.js',
  '/src/scenes/PreloadScene.js',
  '/src/scenes/GameScene.js',
  '/src/scenes/UIScene.js',
  '/src/systems/input.js',
  '/src/systems/save.js',
  '/src/systems/depth.js',
  '/src/data/map.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request);
    })
  );
});
