/* Service worker de Operación Baeza.
   Objetivo: que la app siempre abra (aunque no haya internet) y que puedas ver
   la última versión de tus datos sincronizada, aunque no puedas guardar cambios
   nuevos hasta que vuelva la conexión (eso lo sigue gestionando Firebase). */
const CACHE_NAME = 'operacion-baeza-v85';
const FONT_CACHE = 'operacion-baeza-fonts-v1'; // fuentes de Google: se guardan aparte y sobreviven a las versiones de la app
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];
// Imágenes de la interfaz (fondo y escudos de la cabecera). Se guardan aparte y sin bloquear la
// instalación: si por lo que sea faltara alguna en el servidor, el service worker se instala igual y la
// app sigue funcionando (simplemente esa imagen no aparecería).
const APP_IMAGES = [
  './img/fondo.jpg',
  './img/escudo-izquierdo.png',
  './img/escudo-derecho.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).then(() => Promise.all(APP_IMAGES.map((u) => cache.add(u).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== FONT_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia:
// - Fuentes de Google (Playfair Display): caché primero y se refrescan en segundo plano, para que
//   sin internet la app conserve su tipografía en vez de caer a la fuente por defecto.
// - Recursos propios: red primero para tener siempre la versión más reciente si hay conexión;
//   si falla (sin internet), sirve la copia cacheada.
// - El resto de dominios externos (Firebase/Firestore, etc.) se dejan pasar sin interceptar.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // no tocar Firebase, etc.

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
