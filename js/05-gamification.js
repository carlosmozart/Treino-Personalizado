    // ---------- SISTEMA DE XP E NÍVEIS (1 a 100) ----------
    const MAX_LEVEL = 100;
    const WEEKLY_XP_POOL = 600; // XP total "alvo" por semana, dividido pelos dias de treino do perfil ativo
    const WATER_BONUS_PCT = 0.10;   // +10% do XP de um check-in cheio ao bater a meta de água do dia
    const STREAK_BONUS_PCT = 0.30;  // +30% do XP de um check-in cheio ao completar um ciclo de sequência
    const FREE_MEAL_THRESHOLD_PCT = 0.80; // 80% dos dias planejados na semana libera a refeição livre

    function getFullCheckinXP() {
      const dpw = (getActiveProfile() && getActiveProfile().daysPerWeek) || 6;
      return Math.max(20, Math.round(WEEKLY_XP_POOL / dpw));
    }
    function getHalfCheckinXP() {
      return Math.round(getFullCheckinXP() / 2);
    }
    function getWaterBonusXP() {
      return Math.max(1, Math.round(getFullCheckinXP() * WATER_BONUS_PCT));
    }
    function getStreakBonusXP() {
      return Math.max(1, Math.round(getFullCheckinXP() * STREAK_BONUS_PCT));
    }

    // ---------- CONQUISTAS (estilo Steam) ----------
    const ACHIEVEMENTS = [
      { id: 'primeiro_checkin', name: 'Primeiro Passo', desc: 'Complete seu primeiro check-in.', icon: '🥇', target: 1, current: () => Object.keys(checkins).length },
      { id: 'checkins_10', name: 'Ganhando Ritmo', desc: 'Complete 10 check-ins no total.', icon: '🔥', target: 10, current: () => Object.keys(checkins).length },
      { id: 'checkins_50', name: '50 Treinos', desc: 'Complete 50 check-ins no total.', icon: '💪', target: 50, current: () => Object.keys(checkins).length },
      { id: 'checkins_100', name: 'Centurião', desc: 'Complete 100 check-ins no total.', icon: '🏛️', target: 100, current: () => Object.keys(checkins).length },
      { id: 'streak_7', name: 'Uma Semana de Foco', desc: 'Alcance uma sequência de 7 dias seguidos.', icon: '📅', target: 7, current: () => gamification.longestStreak || 0 },
      { id: 'streak_14', name: 'Chama Acesa', desc: 'Alcance uma sequência de 14 dias seguidos.', icon: '🔥', target: 14, current: () => gamification.longestStreak || 0 },
      { id: 'streak_30', name: 'Inabalável', desc: 'Alcance uma sequência de 30 dias seguidos.', icon: '🏆', target: 30, current: () => gamification.longestStreak || 0 },
      { id: 'level_10', name: 'Nível 10', desc: 'Alcance o nível 10.', icon: '⭐', target: 10, current: () => getLevelInfo(gamification.totalXP).level },
      { id: 'level_25', name: 'Nível 25', desc: 'Alcance o nível 25.', icon: '🌟', target: 25, current: () => getLevelInfo(gamification.totalXP).level },
      { id: 'level_50', name: 'Nível 50', desc: 'Alcance o nível 50.', icon: '💫', target: 50, current: () => getLevelInfo(gamification.totalXP).level },
      { id: 'level_100', name: 'Lenda', desc: 'Alcance o nível máximo: 100.', icon: '👑', target: 100, current: () => getLevelInfo(gamification.totalXP).level },
      { id: 'water_hidratado', name: 'Hidratado(a)', desc: 'Bata a meta de água pela primeira vez.', icon: '💧', target: 1, current: () => Object.keys(gamification.waterBonus || {}).length },
      { id: 'water_30', name: 'Hábito Líquido', desc: 'Bata a meta de água em 30 dias (não precisam ser seguidos).', icon: '🌊', target: 30, current: () => Object.keys(gamification.waterBonus || {}).length },
      { id: 'perfis_2', name: 'Arquiteto de Treinos', desc: 'Crie um segundo perfil de treino.', icon: '📋', target: 2, current: () => Object.keys(profiles).length },
      { id: 'peso_5x', name: 'Compromisso de Peso', desc: 'Registre seu peso 5 vezes no histórico.', icon: '⚖️', target: 5, current: () => (userProfile.weightHistory || []).length },
      { id: 'refeicao_livre', name: 'Refeição Conquistada', desc: 'Desbloqueie sua primeira Refeição Livre.', icon: '🍕', target: 1, current: () => Object.keys(gamification.freeMealRewards || {}).length }
    ];

    function checkAchievements() {
      let unlockedAny = false;
      ACHIEVEMENTS.forEach(a => {
        if (gamification.unlockedAchievements[a.id]) return;
        if (a.current() >= a.target) {
          gamification.unlockedAchievements[a.id] = todayKey();
          unlockedAny = true;
          showToast(`🏆 Conquista desbloqueada: ${a.name}`, 'trophy');
        }
      });
      if (unlockedAny) {
        saveJSON(GAMIFICATION_KEY, gamification);
        if (!conquistasView.classList.contains('hidden')) renderAchievementsView();
      }
    }

    function renderAchievementsView() {
      const unlockedCount = ACHIEVEMENTS.filter(a => gamification.unlockedAchievements[a.id]).length;
      document.getElementById('achievementsCount').textContent = `${unlockedCount}/${ACHIEVEMENTS.length}`;

      const listEl = document.getElementById('achievementsList');
      listEl.innerHTML = ACHIEVEMENTS.map(a => {
        const unlockedDate = gamification.unlockedAchievements[a.id];
        const isUnlocked = !!unlockedDate;
        const current = Math.min(a.current(), a.target);
        const pct = Math.round((current / a.target) * 100);
        return `
          <div class="bg-slate-900 rounded-2xl p-4 border ${isUnlocked ? 'border-amber-700/60' : 'border-slate-800'} shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isUnlocked ? 'bg-amber-950/40 border border-amber-700/50' : 'bg-slate-950/60 border border-slate-800 grayscale opacity-40'}">${a.icon}</div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <h4 class="font-extrabold text-sm ${isUnlocked ? 'text-amber-300' : 'text-slate-300'} truncate">${a.name}</h4>
                ${isUnlocked ? `<span class="text-[9px] font-black text-amber-500 flex-shrink-0">✓ ${unlockedDate}</span>` : ''}
              </div>
              <p class="text-xs text-slate-500 mt-0.5">${a.desc}</p>
              ${!isUnlocked ? `
                <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div class="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style="width: ${pct}%"></div>
                </div>
                <p class="text-[9px] text-slate-600 mt-1">${current}/${a.target}</p>
              ` : ''}
            </div>
          </div>`;
      }).join('');
    }

    function xpForLevel(level) { return 100 + (level - 1) * 15; } // XP necessário para SAIR desse nível

    function getLevelInfo(totalXP) {
      let level = 1;
      let xpAtLevelStart = 0;
      while (level < MAX_LEVEL) {
        const need = xpForLevel(level);
        if (totalXP - xpAtLevelStart < need) break;
        xpAtLevelStart += need;
        level++;
      }
      const need = level < MAX_LEVEL ? xpForLevel(level) : 0;
      return { level, xpIntoLevel: totalXP - xpAtLevelStart, xpToNext: need, totalXP };
    }

    function renderLevelBar() {
      const info = getLevelInfo(gamification.totalXP);
      levelLabel.textContent = `Nível ${info.level}`;
      xpLabel.textContent = info.level >= MAX_LEVEL ? `${info.totalXP} XP (máx)` : `${info.xpIntoLevel}/${info.xpToNext} XP`;
      const pct = info.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((info.xpIntoLevel / info.xpToNext) * 100));
      xpBarFill.style.width = `${pct}%`;
    }

    function grantXP(amount) {
      if (amount <= 0) return;
      const before = getLevelInfo(gamification.totalXP).level;
      gamification.totalXP += amount;
      const after = getLevelInfo(gamification.totalXP).level;
      saveJSON(GAMIFICATION_KEY, gamification);
      renderLevelBar();
      if (after > before) {
        showToast(`🎉 Nível ${after} alcançado!`, 'trophy');
      }
    }

    function revokeXP(amount) {
      if (amount <= 0) return;
      gamification.totalXP = Math.max(0, gamification.totalXP - amount);
      saveJSON(GAMIFICATION_KEY, gamification);
      renderLevelBar();
    }

    // Concede XP de check-in para uma data. Se já houver registro, só completa a diferença
    // quando upgrade de "meio" para "cheio" (idempotente, nunca concede em dobro).
    function grantCheckinXP(dateStr, full) {
      const fullAmount = getFullCheckinXP();
      const targetAmount = full ? fullAmount : getHalfCheckinXP();
      const existing = gamification.checkins[dateStr];
      if (!existing) {
        gamification.checkins[dateStr] = { amount: targetAmount, full };
        grantXP(targetAmount);
      } else if (!existing.full && full) {
        const diff = fullAmount - existing.amount;
        existing.amount = fullAmount;
        existing.full = true;
        grantXP(diff);
      }
      saveJSON(GAMIFICATION_KEY, gamification);
      checkStreakBonus();
      checkFreeMealReward();
      checkAchievements();
    }

    // Bônus de sequência: cada vez que o streak completa um ciclo inteiro dos dias/semana
    // definidos no perfil ativo (ex: perfil de 6 dias → a cada 6 dias seguidos), concede +30% XP.
    function checkStreakBonus() {
      const profile = getActiveProfile();
      if (!profile) return;
      const dpw = profile.daysPerWeek || 6;
      const streak = calculateStreak();
      const multiple = Math.floor(streak / dpw);
      if (multiple < 1) return;
      const key = `${activeProfileId}_${multiple}`;
      if (gamification.streakBonuses[key]) return;
      gamification.streakBonuses[key] = true;
      saveJSON(GAMIFICATION_KEY, gamification);
      grantXP(getStreakBonusXP());
      showToast(`🔥 Sequência de ${streak} dias! +${getStreakBonusXP()} XP de bônus`, 'trophy');
    }

    // Prêmio de refeição livre: ao completar 80% dos dias planejados na semana atual (Seg-Dom),
    // libera o direito a uma refeição livre no fim de semana. Um prêmio por semana.
    function getCurrentWeekKey() {
      return getMondayOfCurrentWeek().toISOString().slice(0, 10);
    }

    function calculateWeeklyCheckinCount() {
      const monday = getMondayOfCurrentWeek();
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (checkins[d.toISOString().slice(0, 10)]) count++;
      }
      return count;
    }

    function checkFreeMealReward() {
      const profile = getActiveProfile();
      if (!profile) return;
      const dpw = profile.daysPerWeek || 6;
      const threshold = Math.ceil(dpw * FREE_MEAL_THRESHOLD_PCT);
      const checkedThisWeek = calculateWeeklyCheckinCount();
      const weekKey = getCurrentWeekKey();
      if (checkedThisWeek < threshold || gamification.freeMealRewards[weekKey]) return;
      gamification.freeMealRewards[weekKey] = true;
      saveJSON(GAMIFICATION_KEY, gamification);
      showToast('🍕 Refeição Livre liberada! Você bateu 80% do treino da semana.', 'trophy');
    }

    function revokeCheckinXP(dateStr) {
      const existing = gamification.checkins[dateStr];
      if (!existing) return;
      revokeXP(existing.amount);
      delete gamification.checkins[dateStr];
      saveJSON(GAMIFICATION_KEY, gamification);
    }

    function areAllExercisesDoneForActiveWorkout() {
      const workout = getActiveProfile().schedule[activeWorkoutKey];
      return workout.exercises.length > 0 && workout.exercises.every(ex => formData[ex.id] && formData[ex.id].done);
    }
