window.TREINO_INITIAL_MIGRATIONS = {
  create({
    getSessionLog, getProfiles, getGamification, getActiveProfileId, setActiveProfileId, loadString,
    saveString, saveJSON, saveSessionLog, entryDateKey, compareByDate, DAY_ORDER, PROFILES_KEY,
    ACTIVE_PROFILE_KEY, GAMIFICATION_KEY, SEED_WORKOUT_DATABASE, todayKey
  }) {
    function sanitizeSessionLog() {
      if (loadString('treino_log_sanitized')) return;
      let removidas = 0;
      Object.keys(getSessionLog()).forEach(k => {
        const lista = getSessionLog()[k] || [];
        const limpa = lista.filter(e => entryDateKey(e));
        if (limpa.length !== lista.length) removidas += lista.length - limpa.length;
        if (limpa.length === 0) delete getSessionLog()[k];
        else { limpa.sort(compareByDate); getSessionLog()[k] = limpa; }
      });
      if (removidas > 0) saveSessionLog();
      saveString('treino_log_sanitized', '1');
    }

    function migrateOptionalDays() {
      if (loadString('treino_optional_migrated')) return;
      let mudou = false;
      Object.keys(getProfiles()).forEach(pid => {
        const sched = getProfiles()[pid] && getProfiles()[pid].schedule;
        if (!sched) return;
        DAY_ORDER.forEach(k => {
          const dia = sched[k];
          if (!dia || dia.optional) return;
          const nome = (dia.name || '') + ' ' + (dia.focus || '');
          if (/opcional/i.test(nome)) { dia.optional = true; mudou = true; }
        });
      });
      if (mudou) saveJSON(PROFILES_KEY, getProfiles());
      saveString('treino_optional_migrated', '1');
    }

    function ensureProfilesSeeded() {
      if (Object.keys(getProfiles()).length === 0) {
        const id = 'default';
        getProfiles()[id] = {
          id,
          name: 'PPL Hipertrofia e Emagrecimento',
          description: 'Plano original: Push/Pull/Legs 2x por semana, adaptado a escoliose e joelho, com ênfase em peitoral inferior.',
          daysPerWeek: 6,
          trainingTime: '12:00',
          schedule: SEED_WORKOUT_DATABASE,
          createdAt: todayKey(),
          updatedAt: todayKey()
        };
        saveJSON(PROFILES_KEY, getProfiles());
      }
      if (!getActiveProfileId() || !getProfiles()[getActiveProfileId()]) {
        setActiveProfileId(Object.keys(getProfiles())[0]);
        saveString(ACTIVE_PROFILE_KEY, getActiveProfileId());
      }
      getGamification().equippedProfiles = getGamification().equippedProfiles || {};
      if (!getGamification().equippedProfiles[getActiveProfileId()]) {
        getGamification().equippedProfiles[getActiveProfileId()] = true;
        saveJSON(GAMIFICATION_KEY, getGamification());
      }
    }


    return { sanitizeSessionLog, migrateOptionalDays, ensureProfilesSeeded };
  }
};
