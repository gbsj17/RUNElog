const CACHE_NAME = 'runelog-v3';

const ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/images/icon.png',
  './js/app.js',
  './js/config/supabase-keys.js',
  './js/config/supabase-config.js',
  './js/auth/auth.js',
  './js/modules/log/log-core.js',
  './js/modules/log/log-rotas.js',
  './js/modules/log/log-fretes.js',
  './js/modules/admin/admin-dashboard.js',
  './js/modules/admin/admin-tenants.js',
  './js/modules/admin/admin-planos.js',
  './js/modules/empresa/gestao-equipe.js',
  './js/modules/motoristas/motorista.js',
  './js/modules/representantes/representante.js',
  './import-cargas.html',
  './js/modules/importador/cargas-store.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response('', { status: 404, statusText: 'Not Found' });
    })
  );
});