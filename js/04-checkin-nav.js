    // ---------- CHECK-IN SEMANAL (Segunda a Domingo) ----------
    const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
    function getMondayOfCurrentWeek() {
      const d = new Date();
      const day = d.getDay(); // 0 = domingo
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function renderCheckinGrid() {
      const monday = getMondayOfCurrentWeek();
      const todayStr = todayKey();
      checkinGrid.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const checked = !!checkins[dateStr];
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.animationDelay = `${i * 40}ms`;
        if (isToday) {
          btn.onclick = () => toggleCheckin(dateStr, btn);
        } else {
          btn.disabled = true;
          btn.title = isPast
            ? 'Dias passados não podem ser marcados retroativamente — isso preserva a integridade do seu XP.'
            : 'Dias futuros só podem ser marcados quando chegar a data.';
        }
        btn.className = `checkin-pop flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-150 ${isToday ? 'active:scale-95' : 'cursor-not-allowed'} ${
          checked
            ? 'bg-emerald-950/40 border-emerald-700 text-emerald-400'
            : isToday
              ? 'bg-blue-950/40 border-blue-700 text-blue-300 pulse-glow'
              : 'bg-slate-950/50 border-slate-800 text-slate-600 opacity-60'
        }`;
        btn.innerHTML = `
          <span class="text-[9px] font-black uppercase tracking-wider">${DAY_LABELS[i]}</span>
          <span class="text-sm font-extrabold mt-1">${d.getDate()}</span>
          <span class="mt-1 text-base leading-none">${checked ? '✅' : isToday ? '⏳' : isPast ? '·' : '🔒'}</span>
        `;
        checkinGrid.appendChild(btn);
      }
      const streak = calculateStreak();
      const monthly = calculateMonthlyCount();
      streakLabel.textContent = `${streak} dia${streak === 1 ? '' : 's'} seguidos`;
      monthlyLabel.textContent = `${monthly} dia${monthly === 1 ? '' : 's'} no mês`;
      renderWeeklyProgress();
      if (streak > (gamification.longestStreak || 0)) {
        gamification.longestStreak = streak;
        saveJSON(GAMIFICATION_KEY, gamification);
      }
      checkAchievements();
    }

    function renderWeeklyProgress() {
      const profile = getActiveProfile();
      const dpw = (profile && profile.daysPerWeek) || 6;
      const checkedThisWeek = calculateWeeklyCheckinCount();
      const threshold = Math.ceil(dpw * FREE_MEAL_THRESHOLD_PCT);
      const pct = Math.min(100, Math.round((checkedThisWeek / dpw) * 100));
      document.getElementById('weeklyProgressLabel').textContent = `${checkedThisWeek}/${dpw} dias`;
      document.getElementById('weeklyProgressFill').style.width = `${pct}%`;
      const weekKey = getCurrentWeekKey();
      const unlocked = !!(gamification.freeMealRewards && gamification.freeMealRewards[weekKey]);
      const statusEl = document.getElementById('freeMealStatus');
      if (unlocked) {
        statusEl.textContent = '🍕 Refeição Livre liberada nesta semana! Aproveite no fim de semana.';
        statusEl.className = 'text-[10px] text-amber-400 font-bold mt-2 text-center';
      } else {
        statusEl.textContent = `Faltam ${Math.max(0, threshold - checkedThisWeek)} dia${Math.max(0, threshold - checkedThisWeek) === 1 ? '' : 's'} para liberar a Refeição Livre (80% da semana) 🍕`;
        statusEl.className = 'text-[10px] text-slate-600 mt-2 text-center';
      }
    }

    function toggleCheckin(dateStr, btnEl) {
      // segurança extra: mesmo que chamado programaticamente, só o dia de hoje pode ser alterado
      if (dateStr !== todayKey()) return;
      if (checkins[dateStr]) {
        delete checkins[dateStr];
        revokeCheckinXP(dateStr);
      } else {
        checkins[dateStr] = activeWorkoutKey;
        const full = dateStr === todayKey() && areAllExercisesDoneForActiveWorkout();
        grantCheckinXP(dateStr, full);
        if (btnEl) {
          btnEl.classList.remove('checkin-pop');
          void btnEl.offsetWidth; // reinicia a animação
          btnEl.classList.add('checkin-bounce');
        }
      }
      saveJSON(CHECKIN_KEY, checkins);
      renderCheckinGrid();
    }

    function calculateStreak() {
      let streak = 0;
      let d = new Date();
      d.setHours(0, 0, 0, 0);
      let firstDay = true;
      while (true) {
        const key = d.toISOString().slice(0, 10);
        if (checkins[key]) { streak++; d.setDate(d.getDate() - 1); firstDay = false; }
        else if (firstDay) { d.setDate(d.getDate() - 1); firstDay = false; } // hoje ainda pendente, não quebra
        else break;
      }
      return streak;
    }

    function calculateMonthlyCount() {
      const prefix = new Date().toISOString().slice(0, 7); // YYYY-MM
      return Object.keys(checkins).filter(k => k.startsWith(prefix)).length;
    }

    // ---------- NAVEGAÇÃO ENTRE ABAS ----------
    function switchView(view) {
      treinoView.classList.toggle('hidden', view !== 'treino');
      planosView.classList.toggle('hidden', view !== 'planos');
      perfilView.classList.toggle('hidden', view !== 'perfil');
      conquistasView.classList.toggle('hidden', view !== 'conquistas');

      const activeCls = 'bg-blue-600 text-white';
      const inactiveCls = 'text-slate-500';
      navTreino.className = `px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${view === 'treino' ? activeCls : inactiveCls}`;
      navPlanos.className = `px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${view === 'planos' ? activeCls : inactiveCls}`;
      navPerfil.className = `px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${view === 'perfil' ? activeCls : inactiveCls}`;
      navConquistas.className = `px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${view === 'conquistas' ? activeCls : inactiveCls}`;

      if (view === 'perfil') renderPerfilView();
      if (view === 'planos') { closeProfileEditor(); renderProfileList(); }
      if (view === 'conquistas') renderAchievementsView();
    }

    // ---------- TOAST GENÉRICO ----------
    let toastTimeout = null;
    function showToast(message, icon = 'check') {
      const iconPath = icon === 'trophy'
        ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        : 'M5 13l4 4L19 7';
      toast.querySelector('svg path').setAttribute('d', iconPath);
      toast.querySelector('span').textContent = message;
      toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
      }, 3200);
    }
