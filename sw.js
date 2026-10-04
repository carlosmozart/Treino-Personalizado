const CACHE_NAME = 'treino-cache-v2.21.2';
const ASSETS = [
  './',
  './index.html',
  './data/static-config.js',
  './data/achievements.js',
  './js/ui/achievements.js',
  './js/core/date-utils.js',
  './js/core/storage-utils.js',
  './js/core/history-utils.js',
  './js/core/session-history.js',
  './js/core/session-history.js',
  './js/core/backup-crypto.js',
  './js/core/backup-utils.js',
  './js/core/backup-validation.js',
  './js/core/backup-restore.js',
  './js/core/display-utils.js',
  './js/core/calorie-utils.js',
  './js/core/level-utils.js',
  './js/core/streak-utils.js',
  './js/core/checkin-xp-utils.js',
  './js/core/volume-utils.js',
  './js/core/profile-utils.js',
  './js/core/health-utils.js',
  './js/core/rewards.js',
  './js/core/workout-draft.js',
  './js/core/series-utils.js',
  './js/ui/profile-progress.js',
  './js/ui/charts.js',
  './js/ui/backup.js',
  './js/ui/backup-status.js',
  './js/ui/profile-health.js',
  './js/ui/profile-actions.js',
  './js/ui/navigation.js',
  './js/ui/weekly-checkins.js',
  './js/ui/workout-recording.js',
  './js/ui/series-actions.js',
  './js/ui/exercise-cards.js',
  './js/ui/exercise-actions.js',
  './js/ui/plan-editor-rows.js',
  './js/ui/plan-editor-actions.js',
  './js/ui/plan-editor.js',
  './js/ui/plan-management.js',
  './js/core/ai-plan.js',
  './js/ui/ai-plan.js',
  './js/ui/swap-picker.js',
  './js/ui/notifications.js',
  './js/ui/rest-timer.js',
  './js/ui/release-notes.js',
  './js/ui/app-update.js',
  './js/ui/onboarding.js',
  './js/ui/modal-accessibility.js',
  './js/ui/app-lifecycle.js',
  './js/core/history-storage.js',
  './js/core/local-persistence.js',
  './js/core/workout-duration.js',
  './js/ui/tooltips.js',
  './js/ui/confirmation.js',
  './js/ui/app-feedback.js',
  './js/ui/clipboard.js',
  './js/core/initial-migrations.js',
  './js/core/history-queries.js',
  './js/ui/workout-summary.js',
  './js/core/workout-calories.js',
  './js/ui/workout-controls.js',
  './data/seed-workouts.js',
  './js/ui/workout-calendar.js',
  './js/ui/workout-history-list.js',
  './js/ui/workout-day.js',
  './js/ui/history-editor.js',
  './js/ui/workout-undo.js',
  './js/ui/weekly-volume.js',
  './js/ui/exercise-progress.js',
  './js/ui/charts.js',
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
