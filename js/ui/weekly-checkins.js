// Grade semanal, progresso e ações de check-in com estado atual injetado.
window.TREINO_WEEKLY_CHECKINS = {
  create({ document, checkinGrid, streakLabel, monthlyLabel, DAY_LABELS,
      getMondayOfCurrentWeek, todayKey, formatLocalDateKey,
      getSessionLog, getCheckins, getGamification, getActiveWorkoutKey,
      openWorkoutDay, calculateStreak, calculateMonthlyCount,
      saveJSON, GAMIFICATION_KEY, CHECKIN_KEY, checkAchievements,
      getActiveProfile, calculateWeeklyCheckinCount, getFreeMealThreshold,
      getCurrentWeekKey, revokeCheckinXP, grantCheckinXP, areAllExercisesDoneForActiveWorkout }) {
    function renderCheckinGrid() {
      const monday = getMondayOfCurrentWeek();
      const todayStr = todayKey();
      checkinGrid.innerHTML = '';

      // datas que possuem exercicios registrados, para marcar quais dias abrem resumo
      const diasComRegistro = new Set();
      Object.keys(getSessionLog()).forEach(k => {
        (getSessionLog()[k] || []).forEach(e => { if (e && e.date) diasComRegistro.add(e.date); });
      });
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = formatLocalDateKey(d);
        const checked = !!getCheckins()[dateStr];
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        // um dia passado com exercicios registrados deixa de ser apenas um marcador inerte:
        // passa a abrir o resumo daquele treino. Marcar/desmarcar continua exclusivo de hoje.
        const temResumo = isPast && diasComRegistro.has(dateStr);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.animationDelay = `${i * 40}ms`;
        if (isToday) {
          btn.onclick = () => toggleCheckin(dateStr, btn);
        } else if (temResumo) {
          btn.onclick = () => openWorkoutDay(dateStr);
          btn.title = 'Ver o que você treinou neste dia';
        } else {
          btn.disabled = true;
          btn.title = isPast
            ? 'Dias passados não podem ser marcados retroativamente — isso preserva a integridade do seu XP.'
            : 'Dias futuros só podem ser marcados quando chegar a data.';
        }
        btn.className = `checkin-pop flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-150 ${(isToday || temResumo) ? 'active:scale-95' : 'cursor-not-allowed'} ${
          checked
            ? 'bg-emerald-950/40 border-emerald-700 text-emerald-400'
            : isToday
              ? 'bg-blue-950/40 border-blue-700 text-blue-300 pulse-glow'
              : temResumo
                ? 'bg-slate-950/50 border-slate-700 text-slate-500'
                : 'bg-slate-950/50 border-slate-800 text-slate-600 opacity-60'
        }`;
        btn.innerHTML = `
          <span class="text-[11px] font-black uppercase tracking-wider">${DAY_LABELS[i]}</span>
          <span class="text-sm font-extrabold mt-1">${d.getDate()}</span>
          <span class="mt-1 text-base leading-none">${checked ? '✅' : isToday ? '⏳' : isPast ? '·' : '🔒'}</span>
          ${temResumo ? '<span class="text-[9px] text-blue-400 font-black uppercase tracking-wider mt-0.5">ver</span>' : ''}
        `;
        checkinGrid.appendChild(btn);
      }
      const streak = calculateStreak();
      const monthly = calculateMonthlyCount();
      streakLabel.textContent = `${streak} treino${streak === 1 ? '' : 's'} seguidos`;
      monthlyLabel.textContent = `${monthly} dia${monthly === 1 ? '' : 's'} no mês`;
      renderWeeklyProgress();
      if (streak > (getGamification().longestStreak || 0)) {
        getGamification().longestStreak = streak;
        saveJSON(GAMIFICATION_KEY, getGamification());
      }
      checkAchievements();
    }

    function renderWeeklyProgress() {
      const profile = getActiveProfile();
      const dpw = (profile && profile.daysPerWeek) || 6;
      const checkedThisWeek = calculateWeeklyCheckinCount();
      const threshold = Math.ceil(dpw * getFreeMealThreshold());
      const pct = Math.min(100, Math.round((checkedThisWeek / dpw) * 100));
      document.getElementById('weeklyProgressLabel').textContent = `${checkedThisWeek}/${dpw} dias`;
      document.getElementById('weeklyProgressFill').style.width = `${pct}%`;
      const weekKey = getCurrentWeekKey();
      const unlocked = !!(getGamification().freeMealRewards && getGamification().freeMealRewards[weekKey]);
      const statusEl = document.getElementById('freeMealStatus');
      if (unlocked) {
        statusEl.textContent = '🍕 Refeição Livre liberada nesta semana! Aproveite no fim de semana.';
        statusEl.className = 'text-[11px] text-amber-400 font-bold mt-2 text-center';
      } else {
        statusEl.textContent = `Faltam ${Math.max(0, threshold - checkedThisWeek)} dia${Math.max(0, threshold - checkedThisWeek) === 1 ? '' : 's'} para liberar a Refeição Livre (80% da semana) 🍕`;
        statusEl.className = 'text-[11px] text-slate-600 mt-2 text-center';
      }
    }

    function toggleCheckin(dateStr, btnEl) {
      // segurança extra: mesmo que chamado programaticamente, só o dia de hoje pode ser alterado
      if (dateStr !== todayKey()) return;
      if (getCheckins()[dateStr]) {
        delete getCheckins()[dateStr];
        revokeCheckinXP(dateStr);
      } else {
        getCheckins()[dateStr] = getActiveWorkoutKey();
        const full = dateStr === todayKey() && areAllExercisesDoneForActiveWorkout();
        grantCheckinXP(dateStr, full);
        if (btnEl) {
          btnEl.classList.remove('checkin-pop');
          void btnEl.offsetWidth; // reinicia a animação
          btnEl.classList.add('checkin-bounce');
        }
      }
      saveJSON(CHECKIN_KEY, getCheckins());
      renderCheckinGrid();
    }
    return { renderCheckinGrid, renderWeeklyProgress, toggleCheckin };
  }
};
