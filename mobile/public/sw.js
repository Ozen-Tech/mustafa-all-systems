/* Service Worker — v6: fix modal exclusão de fotos + GPS cache */
const CACHE_NAME = 'mustafa-promotor-v6';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

function isHtmlResponse(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  return ct.includes('text/html');
}

function isAssetRequest(url) {
  return (
    url.pathname.includes('/_expo/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.map') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', cache: CACHE_NAME });
          });
        })
      )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API: sempre rede
  if (url.pathname.startsWith('/api') || url.hostname.includes('run.app')) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML / navegação: network-first (evita index.html antigo apontando para JS deletado)
  const acceptsHtml = (req.headers.get('accept') || '').includes('text/html');
  if (
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    acceptsHtml
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => null);
          }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS/assets: network-first; NUNCA fallback para index.html
  if (url.origin === self.location.origin && isAssetRequest(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Firebase rewrite devolve HTML 200 para asset inexistente — não cachear isso
          if (res.ok && !isHtmlResponse(res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => null);
            return res;
          }
          if (isHtmlResponse(res)) {
            return caches.match(req).then((cached) => {
              if (cached && !isHtmlResponse(cached)) return cached;
              return new Response('/* asset missing */', {
                status: 404,
                headers: { 'Content-Type': 'application/javascript' },
              });
            });
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (cached && !isHtmlResponse(cached)) return cached;
            return new Response('/* offline */', {
              status: 503,
              headers: { 'Content-Type': 'application/javascript' },
            });
          })
        )
    );
    return;
  }

  // Demais: network, com cache opcional
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin && !isHtmlResponse(res)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => null);
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
