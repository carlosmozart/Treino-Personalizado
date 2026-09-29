// Recompensas com estado e efeitos injetados; não mantém cópias do estado restaurável.
window.TREINO_REWARDS = {
  create({ getGamification, getCheckins, getActiveProfile, getActiveProfileId,
    getUserProfile, getWaterLog, getLevelInfo, saveJSON, GAMIFICATION_KEY,
    renderLevelBar, showToast, getFullCheckinXP, getHalfCheckinXP,
    getStreakBonusXP, getWaterBonusXP, calculateStreak, checkAchievements,
    formatLocalDateKey, getMondayOfCurrentWeek, FREE_MEAL_THRESHOLD_PCT,
    todayKey, computeWaterTargetMl, now = () => new Date() }) {
    function grantXP(amount) {
      if (amount <= 0) return;
      const before = getLevelInfo(getGamification().totalXP).level;
      getGamification().totalXP += amount;
      const after = getLevelInfo(getGamification().totalXP).level;
      saveJSON(GAMIFICATION_KEY, getGamification());
      renderLevelBar();
      if (after > before) {
        showToast(`🎉 Nível ${after} alcançado!`, 'trophy');
      }
    }

    function revokeXP(amount) {
      if (amount <= 0) return;
      getGamification().totalXP = Math.max(0, getGamification().totalXP - amount);
      saveJSON(GAMIFICATION_KEY, getGamification());
      renderLevelBar();
    }

    // Concede XP de check-in para uma data. Se já houver registro, só completa a diferença
    // quando upgrade de "meio" para "cheio" (idempotente, nunca concede em dobro).
    function grantCheckinXP(dateStr, full) {
      const fullAmount = getFullCheckinXP();
      const targetAmount = full ? fullAmount : getHalfCheckinXP();
      const existing = getGamification().checkins[dateStr];
      if (!existing) {
        getGamification().checkins[dateStr] = { amount: targetAmount, full };
        grantXP(targetAmount);
      } else if (!existing.full && full) {
        const diff = fullAmount - existing.amount;
        existing.amount = fullAmount;
        existing.full = true;
        grantXP(diff);
      }
      // check-in noturno: entre 21h e 6h59 (achievement "Eu Sou a Vingança, Eu Sou a Noite")
      const hour = now().getHours();
      if (hour >= 21 || hour < 7) {
        getGamification().nightCheckins = getGamification().nightCheckins || {};
        getGamification().nightCheckins[dateStr] = true;
      }
      saveJSON(GAMIFICATION_KEY, getGamification());
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
      const key = `${getActiveProfileId()}_${multiple}`;
      if (getGamification().streakBonuses[key]) return;
      getGamification().streakBonuses[key] = true;
      saveJSON(GAMIFICATION_KEY, getGamification());
      grantXP(getStreakBonusXP());
      showToast(`🔥 Sequência de ${streak} treinos! +${getStreakBonusXP()} XP de bônus`, 'trophy');
    }

    // Prêmio de refeição livre: ao completar 80% dos dias planejados na semana atual (Seg-Dom),
    // libera o direito a uma refeição livre no fim de semana. Um prêmio por semana.
    function getCurrentWeekKey() {
      return formatLocalDateKey(getMondayOfCurrentWeek());
    }

    function calculateWeeklyCheckinCount() {
      const monday = getMondayOfCurrentWeek();
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (getCheckins()[formatLocalDateKey(d)]) count++;
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
      if (checkedThisWeek < threshold || getGamification().freeMealRewards[weekKey]) return;
      getGamification().freeMealRewards[weekKey] = true;
      saveJSON(GAMIFICATION_KEY, getGamification());
      showToast('🍕 Refeição Livre liberada! Você bateu 80% do treino da semana.', 'trophy');
    }

    function revokeCheckinXP(dateStr) {
      const existing = getGamification().checkins[dateStr];
      if (!existing) return;
      revokeXP(existing.amount);
      delete getGamification().checkins[dateStr];
      saveJSON(GAMIFICATION_KEY, getGamification());
    }

    function checkWaterBonus() {
      const today = todayKey();
      const target = computeWaterTargetMl(parseFloat(getUserProfile().weight), getUserProfile().activityLevel);
      const consumed = getWaterLog()[today] || 0;
      if (target > 0 && consumed >= target && !getGamification().waterBonus[today]) {
        getGamification().waterBonus[today] = true;
        saveJSON(GAMIFICATION_KEY, getGamification());
        const bonus = getWaterBonusXP();
        grantXP(bonus);
        showToast(`💧 Meta de água batida! +${bonus} XP (10% do check-in)`, 'trophy');
        checkAchievements();
      }
    }

    function checkBirthday() {
      if (!getUserProfile().birthdate) return;
      const b = new Date(getUserProfile().birthdate + 'T00:00:00');
      if (isNaN(b.getTime())) return;
      const today = now();
      if (today.getMonth() !== b.getMonth() || today.getDate() !== b.getDate()) return;
      const year = today.getFullYear();
      getGamification().birthdayGreeted = getGamification().birthdayGreeted || {};
      if (getGamification().birthdayGreeted[year]) return;
      getGamification().birthdayGreeted[year] = true;
      saveJSON(GAMIFICATION_KEY, getGamification());
      const name = getUserProfile().name ? `, ${getUserProfile().name}` : '';
      showToast(`🎂 Feliz Aniversário${name}! Que seu novo ano venha com mais força e saúde.`, 'trophy');
      checkAchievements();
    }
    return { grantXP, revokeXP, grantCheckinXP, checkStreakBonus, getCurrentWeekKey, calculateWeeklyCheckinCount, checkFreeMealReward, revokeCheckinXP, checkWaterBonus, checkBirthday };
  }
};
