const CACHE_NAME = 'treino-cache-v2.19.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192-v3.png',
  './icons/icon-512-v3.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // `cache: 'reload'` obriga cada arquivo a vir da rede ao popular o cache. Sem isso o
      // navegador pode entregar sua propria copia HTTP ja armazenada, e o cache do service
      // worker nasce com uma versao ANTIGA do app — que so apareceria quando o usuario
      // ficasse sem internet, exatamente quando ele depende do cache.
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: "network-first" para o documento HTML (navegação) — sempre tenta buscar a
// versão mais nova primeiro, e só cai para o cache se estiver offline. Isso garante que
// toda vez que o app for aberto com internet, a versão mais recente é usada.
// Para os demais arquivos (ícones, manifest), usa cache-first, já que raramente mudam.
self.addEventListener('fetch', (event) => {
  // Cache Storage só aceita requisições GET. Deixar POST/PUT/etc. passarem evita que uma
  // futura integração de formulário/API falhe por uma tentativa indevida de cachear a resposta.
  if (event.request.method !== 'GET') return;

  const cacheResponse = (request, response) => {
    // Não guardar páginas de erro; uma resposta opaca é válida para recursos de outra origem.
    if (!response || (!response.ok && response.type !== 'opaque')) return;
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(request, response.clone()))
        .catch(() => { /* cache é uma melhoria; a resposta de rede continua válida */ })
    );
  };

  const acceptHeader = event.request.headers.get('accept') || '';
  const isNavigation = event.request.mode === 'navigate' ||
    acceptHeader.indexOf('text/html') !== -1;

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          cacheResponse(event.request, response);
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        cacheResponse(event.request, response);
        return response;
      }).catch(() => cached);
    })
  );
});
