// Desbloqueio e apresentação de conquistas, sem alterar pontuação.
window.TREINO_ACHIEVEMENTS_UI = {
  create({ document, ACHIEVEMENTS, getGamification, saveJSON, GAMIFICATION_KEY,
    todayKey, showToast, conquistasView, formatDateBR }) {
    function checkAchievements() {
      let unlockedAny = false;
      ACHIEVEMENTS.forEach(a => {
        if (getGamification().unlockedAchievements[a.id]) return;
        if (a.current() >= a.target) {
          getGamification().unlockedAchievements[a.id] = todayKey();
          unlockedAny = true;
          showToast(`🏆 Conquista desbloqueada: ${a.name}`, 'trophy');
        }
      });
      if (unlockedAny) {
        saveJSON(GAMIFICATION_KEY, getGamification());
        if (!conquistasView.classList.contains('hidden')) renderAchievementsView();
      }
    }

    let achievementsFilter = 'todas';

    function setAchievementsFilter(filter) {
      achievementsFilter = filter;
      renderAchievementsView();
    }

    function renderAchievementsView() {
      const unlockedCount = ACHIEVEMENTS.filter(a => getGamification().unlockedAchievements[a.id]).length;
      document.getElementById('achievementsCount').textContent = `${unlockedCount}/${ACHIEVEMENTS.length}`;

      const activeCls = 'bg-blue-600 text-white';
      const inactiveCls = 'text-slate-500';
      document.getElementById('achFilterTodas').className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-150 ${achievementsFilter === 'todas' ? activeCls : inactiveCls}`;
      document.getElementById('achFilterDesbloqueadas').className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-150 ${achievementsFilter === 'desbloqueadas' ? activeCls : inactiveCls}`;
      document.getElementById('achFilterBloqueadas').className = `flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-150 ${achievementsFilter === 'bloqueadas' ? activeCls : inactiveCls}`;

      const filtered = ACHIEVEMENTS.filter(a => {
        const isUnlocked = !!getGamification().unlockedAchievements[a.id];
        if (achievementsFilter === 'desbloqueadas') return isUnlocked;
        if (achievementsFilter === 'bloqueadas') return !isUnlocked;
        return true;
      });

      document.getElementById('achievementsEmptyState').classList.toggle('hidden', filtered.length > 0);

      const listEl = document.getElementById('achievementsList');
      listEl.innerHTML = filtered.map(a => {
        const unlockedDate = getGamification().unlockedAchievements[a.id];
        const isUnlocked = !!unlockedDate;
        const current = Math.min(a.current(), a.target);
        const pct = Math.round((current / a.target) * 100);
        return `
          <div class="bg-slate-900 rounded-2xl p-4 border ${isUnlocked ? 'border-amber-700/60' : 'border-slate-800'} shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isUnlocked ? 'bg-amber-950/40 border border-amber-700/50' : 'bg-slate-950/60 border border-slate-800 grayscale opacity-40'}">${a.icon}</div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <h4 class="font-extrabold text-sm ${isUnlocked ? 'text-amber-300' : 'text-slate-300'} truncate">${a.name}</h4>
                ${isUnlocked ? `<span class="text-[11px] font-black text-amber-500 flex-shrink-0">✓ ${formatDateBR(unlockedDate)}</span>` : ''}
              </div>
              <p class="text-xs text-slate-500 mt-0.5">${a.desc}</p>
              ${!isUnlocked ? `
                <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div class="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style="width: ${pct}%"></div>
                </div>
                <p class="text-[11px] text-slate-600 mt-1">${current}/${a.target}</p>
              ` : ''}
            </div>
          </div>`;
      }).join('');
    }
    return { checkAchievements, renderAchievementsView, setAchievementsFilter };
  }
};
