window.TREINO_APP_LIFECYCLE = {
  create({
    document, window, navigator, PLATFORM, todayKey, isRestoringBackup, perfilView, renderWaterCard,
    renderIMCCard, renderMetabolismCard, clearDraft, getTodaysWorkoutKey, workoutSelect,
    initializeWorkoutData, renderHeader, renderExercises, renderCheckinGrid, checkBirthday,
    showToast, setInterval, TREINO_BACKUP_RESTORE, localStorage, openSessionDb,
    setupModalAccessibility, storageAvailable, ensureProfilesSeeded, migrateOptionalDays,
    initializeHistory, resetHistoryCaches, sanitizeSessionLog, buildExerciseDatalist,
    migrateHistoryToSessionLog, renderWorkoutSelectOptions, renderLevelBar,
    renderNotificationSettings, syncTrainingReminders, switchView, APP_VERSION, isProfileComplete,
    showOnboarding, loadString, LAST_SEEN_VERSION_KEY, openNovidades, saveString,
    maybeShowSwipeHint, maybeSuggestBackup
  }) {
    // ---------- ROTINA DE VIRADA DE DIA (reset automático à meia-noite) ----------
    let lastKnownDate = todayKey();

    function checkDateRollover() {
      if (isRestoringBackup()) return;
      const current = todayKey();
      if (current === lastKnownDate) return;
      lastKnownDate = current;

      // novo dia: água consumida, check-in do dia e exercícios concluídos partem do zero
      // automaticamente, já que todos são armazenados por data — aqui só garantimos que a
      // tela em uso reflita isso na hora, sem precisar recarregar o app manualmente
      if (!perfilView.classList.contains('hidden')) {
        renderWaterCard();
        renderIMCCard();
        renderMetabolismCard();
      }
      clearDraft(); // o rascunho pertencia a ontem
      const newWorkoutKey = getTodaysWorkoutKey();
      workoutSelect.value = newWorkoutKey;
      initializeWorkoutData(newWorkoutKey);
      renderHeader();
      renderExercises();
      renderCheckinGrid();
      checkBirthday();
      showToast('🕛 Um novo dia começou! Água e check-in foram reiniciados.');
    }

    setInterval(checkDateRollover, 60000); // verifica a virada do dia a cada minuto
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDateRollover(); });

    async function initialize() {
      document.body.inert = true;
      try {
        if (isRestoringBackup() && await TREINO_BACKUP_RESTORE.recover({ storage: localStorage, openDatabase: openSessionDb })) {
          window.location.reload();
          return;
        }
      } catch (error) {
        console.error('Recuperação da restauração pendente falhou.', error);
        showToast('⚠️ A restauração foi interrompida. Libere espaço e reabra o app para recuperar seus dados.');
        return;
      }
      setupModalAccessibility();
      if (!storageAvailable) {
        const warn = document.createElement('div');
        warn.className = 'max-w-3xl mx-auto px-4 mt-4';
        warn.innerHTML = `<div class="bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-bold px-4 py-3 rounded-xl">⚠️ Armazenamento local indisponível neste navegador/modo. Seu progresso não será salvo entre sessões.</div>`;
        document.querySelector('header').insertAdjacentElement('afterend', warn);
      }
      ensureProfilesSeeded();
      migrateOptionalDays();
      // A leitura persistida deve terminar antes das migrações e do primeiro card.
      // Mantém a interface bloqueada para não sobrescrever edições feitas durante a leitura.
      await initializeHistory();
      resetHistoryCaches();
      sanitizeSessionLog();
      buildExerciseDatalist();
      migrateHistoryToSessionLog(); // semeia o log de sessões para quem já usava versões anteriores
      renderWorkoutSelectOptions();
      const startKey = getTodaysWorkoutKey();
      workoutSelect.value = startKey;
      initializeWorkoutData(startKey);
      renderHeader();
      renderExercises();
      renderCheckinGrid();
      renderLevelBar();
      renderNotificationSettings();
      syncTrainingReminders(false).catch(() => {});
      switchView('treino');
      document.body.inert = false;
      document.getElementById('appVersion').textContent = `v${APP_VERSION}`;
      checkBirthday();
      if (!isProfileComplete()) {
        showOnboarding();
      } else {
        const lastSeenVersion = loadString(LAST_SEEN_VERSION_KEY);
        if (lastSeenVersion && lastSeenVersion !== APP_VERSION) {
          openNovidades();
        } else if (!lastSeenVersion) {
          saveString(LAST_SEEN_VERSION_KEY, APP_VERSION);
        }
        maybeShowSwipeHint();
        maybeSuggestBackup();
      }
    }
    window.addEventListener('DOMContentLoaded', initialize);

    // O APK do Capacitor já carrega arquivos locais versionados. Service workers são úteis no
    // site/PWA, mas podem criar uma segunda camada de cache desnecessária dentro do WebView.
    if (!PLATFORM.isNative && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((registration) => {
          // Verifica se ha versao nova toda vez que o app abre. Offline isso SEMPRE falha, e
          // sem o catch a promise rejeitada aparecia no console como erro nao tratado — o
          // app funcionava, mas parecia quebrado para quem olhasse o console.
          registration.update().catch(() => { /* sem rede: segue com a versao em cache */ });

          // se já existe um service worker esperando (versão nova pronta), ativa na hora
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        }).catch(() => { /* offline/local: ignora silenciosamente */ });

        // quando o novo service worker assume o controle, recarrega para servir a versão nova
        let refreshed = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshed) return;
          refreshed = true;
          window.location.reload();
        });
      });
    }

    return { initialize, checkDateRollover };
  }
};
