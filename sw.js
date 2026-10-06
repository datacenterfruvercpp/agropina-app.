/* AgroPiña Pro · Service Worker: funcionamiento sin conexión (PWA) */
const VERSION = 'agropina-v2.0.1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './assets/icon.svg',
  './css/tailwind.css', './css/app.css',
  './vendor/vue.global.prod.js', './vendor/chart.umd.min.js', './vendor/xlsx.full.min.js', './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './vendor/fontawesome/css/all.min.css', './vendor/fontawesome/webfonts/fa-solid-900.woff2', './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fonts/fonts.css', './vendor/fonts/plus-jakarta-sans-latin.woff2',
  './js/utils.js', './js/catalog.js', './js/agronomy.js', './js/weather.js', './js/store.js', './js/demo.js', './js/ui.js', './js/forms.js',
  './js/views/dashboard.js', './js/views/parcelas.js', './js/views/labores.js', './js/views/clima.js', './js/views/mapa.js',
  './js/views/produccion.js', './js/views/finanzas.js', './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'agropina-tiles').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // APIs de clima: siempre red (la app guarda su propia caché)
  if (/open-meteo\.com$/.test(url.hostname)) return;
  // Teselas de mapa: caché primero, para ver la finca sin conexión
  if (/arcgisonline\.com|tile\.openstreetmap\.org/.test(url.hostname)) {
    e.respondWith(caches.open('agropina-tiles').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; } catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // App: stale-while-revalidate
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || (req.mode === 'navigate' ? c.match('./index.html') : Response.error());
  }));
});
