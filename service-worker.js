/* Service worker de Operación Baeza.
   Objetivo: que la app siempre abra (aunque no haya internet) y que puedas ver
   la última versión de tus datos sincronizada, aunque no puedas guardar cambios
   nuevos hasta que vuelva la conexión (eso lo sigue gestionando Firebase). */
const CACHE_NAME = 'operacion-baeza-v16';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: red primero para tener siempre la versión más reciente si hay
// conexión; si falla (sin internet), sirve la copia cacheada. Las llamadas a
// Firebase/Firestore (dominios externos) se dejan pasar sin interceptar.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no tocar Firebase, fuentes, etc.

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
