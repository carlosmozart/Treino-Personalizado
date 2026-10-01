// Navegação e gestos com estado de tela/rolagem privado.
window.TREINO_NAVIGATION = {
  create({ window, document, requestAnimationFrame, treinoView, planosView, perfilView, conquistasView,
    navTreino, navPlanos, navPerfil, navConquistas, renderPerfilView, closeProfileEditor, renderProfileList,
    renderAchievementsView, updateHeaderOnScroll, dismissSwipeHint, setProfileTab,
    renderWeeklyVolume, renderWorkoutHistory, renderWeightHistory, renderGoalRoadmap }) {
    const VIEW_ORDER = ['treino', 'planos', 'perfil', 'conquistas'];
    let currentView = 'treino';
    let navigationGeneration = 0;

    const scrollPositions = { treino: 0, planos: 0, perfil: 0, conquistas: 0 };

    function switchView(view) {
      const generation = ++navigationGeneration;
      // salva a posição de rolagem da aba que está sendo deixada, para restaurar depois
      if (currentView && currentView !== view) {
        scrollPositions[currentView] = window.scrollY;
      }

      currentView = view;
      const viewEls = { treino: treinoView, planos: planosView, perfil: perfilView, conquistas: conquistasView };
      treinoView.classList.toggle('hidden', view !== 'treino');
      planosView.classList.toggle('hidden', view !== 'planos');
      perfilView.classList.toggle('hidden', view !== 'perfil');
      conquistasView.classList.toggle('hidden', view !== 'conquistas');

      const activeEl = viewEls[view];
      if (activeEl) {
        activeEl.classList.remove('view-slide-in');
        void activeEl.offsetWidth;
        activeEl.classList.add('view-slide-in');
      }

      const activeCls = 'bg-blue-600 text-white';
      const inactiveCls = 'text-slate-500';
      const baseCls = 'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 active:scale-95';
      navTreino.className = `${baseCls} ${view === 'treino' ? activeCls : inactiveCls}`;
      navPlanos.className = `${baseCls} ${view === 'planos' ? activeCls : inactiveCls}`;
      navPerfil.className = `${baseCls} ${view === 'perfil' ? activeCls : inactiveCls}`;
      navConquistas.className = `${baseCls} ${view === 'conquistas' ? activeCls : inactiveCls}`;

      if (view === 'perfil') renderPerfilView();
      if (view === 'planos') { closeProfileEditor(); renderProfileList(); }
      if (view === 'conquistas') renderAchievementsView();

      // restaura a rolagem salva da aba que está sendo aberta, depois do conteúdo renderizar
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          if (generation !== navigationGeneration) return;
          const targetY = scrollPositions[view] || 0;
          window.scrollTo(0, targetY);
          if (typeof updateHeaderOnScroll === 'function') updateHeaderOnScroll();
          // A altura do cabeçalho muda após a rolagem. O scroll anchoring pode
          // deslocar a posição restaurada durante essa transição.
          const header = document.getElementById('appHeader');
          await Promise.allSettled((header?.getAnimations({ subtree: true }) || [])
            .map(animation => animation.finished));
          requestAnimationFrame(() => {
            if (generation === navigationGeneration) window.scrollTo(0, targetY);
          });
        });
      });
    }

    // ---------- NAVEGAÇÃO POR SWIPE (gestos horizontais) ----------
    (function setupSwipeNavigation() {
      let startX = 0, startY = 0, startTime = 0, tracking = false;

      document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) { tracking = false; return; }
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        tracking = true;
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        const elapsed = Date.now() - startTime;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // só considera gesto horizontal claro, rápido o suficiente, ignorando scroll vertical
        if (absX < 70 || absX < absY * 1.5 || elapsed > 600) return;

        const idx = VIEW_ORDER.indexOf(currentView);
        if (deltaX < 0 && idx < VIEW_ORDER.length - 1) {
          switchView(VIEW_ORDER[idx + 1]); // arrastou pra esquerda -> próxima aba
          dismissSwipeHint();
        } else if (deltaX > 0 && idx > 0) {
          switchView(VIEW_ORDER[idx - 1]); // arrastou pra direita -> aba anterior
          dismissSwipeHint();
        }
      }, { passive: true });
    })();

    function switchPerfilSubTab(tab) {
      setProfileTab(tab);
      document.getElementById('perfilSubDadosContent').classList.toggle('hidden', tab !== 'dados');
      document.getElementById('perfilSubSaudeContent').classList.toggle('hidden', tab !== 'saude');
      document.getElementById('perfilSubProgressoContent').classList.toggle('hidden', tab !== 'progresso');

      // Progresso mostra dados que mudam a cada treino: remonta ao ser exibida, em vez de
      // reaproveitar o que foi renderizado quando a aba Perfil foi aberta
      if (tab === 'progresso') {
        renderWeeklyVolume();
        renderWorkoutHistory();
        renderWeightHistory();
        renderGoalRoadmap();
      }

      const activeCls = 'bg-blue-600 text-white';
      const inactiveCls = 'text-slate-500';
      document.getElementById('perfilSubDados').className = `flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${tab === 'dados' ? activeCls : inactiveCls}`;
      document.getElementById('perfilSubSaude').className = `flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${tab === 'saude' ? activeCls : inactiveCls}`;
      document.getElementById('perfilSubProgresso').className = `flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${tab === 'progresso' ? activeCls : inactiveCls}`;
    }
    return { switchView, switchPerfilSubTab };
  }
};
