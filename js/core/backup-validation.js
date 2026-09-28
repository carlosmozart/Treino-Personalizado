// Validação e resumo puros de backups. A interface decide como exibir erros e confirmações.
window.TREINO_BACKUP_VALIDATION = (() => {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string';
  const number = value => typeof value === 'number' && Number.isFinite(value);
  // Formulários antigos serializam números como texto; preservar essa compatibilidade.
  const numeric = value => number(value) || (text(value) && (value === '' || (value.trim() !== '' && Number.isFinite(Number(value)))));
  const bool = value => typeof value === 'boolean';
  const list = check => value => Array.isArray(value) && value.every(check);
  const map = check => value => object(value) && Object.values(value).every(check);
  const fields = (value, schema) => object(value) && Object.entries(schema).every(([key, check]) =>
    !Object.hasOwn(value, key) || check(value[key]));
  const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
  const day = value => days.includes(value);
  const series = value => fields(value, { reps: numeric, weight: numeric, done: bool });
  const entry = value => fields(value, {
    name: text, date: text, type: text, obs: text, customName: text,
    sets: numeric, reps: numeric, weight: numeric, duration: numeric, distance: numeric,
    variantIndex: numeric, done: bool, series: list(series)
  });
  const exercise = value => entry(value) && text(value.id) && text(value.name) && fields(value, {
    optional: bool, alt: text, targetSets: numeric, targetReps: numeric, targetWeight: numeric,
    targetDuration: numeric, targetDistance: numeric, restSeconds: numeric,
    backups: list(backup => object(backup) && text(backup.name) && fields(backup, { type: text }))
  });
  const plan = value => fields(value, {
    id: text, name: text, description: text, daysPerWeek: numeric, trainingTime: text,
    createdAt: text, updatedAt: text
  }) && object(value.schedule) && days.every(key => {
    const workout = value.schedule[key];
    return fields(workout, { focus: text, optional: bool }) && text(workout.name) && list(exercise)(workout.exercises);
  });
  const schemas = {
    treino_user_profile: value => fields(value, {
      name: text, birthdate: text, sex: text, activityLevel: text, tmbFormula: text,
      age: numeric, height: numeric, weight: numeric, targetWeight: numeric, bodyFatPercent: numeric,
      weightGoal: goal => object(goal) && number(goal.startWeight) && goal.startWeight > 0 && number(goal.targetWeight) && goal.targetWeight > 0 && text(goal.startedAt) && /^\d{4}-\d{2}-\d{2}$/.test(goal.startedAt) &&
        fields(goal, { checkpoints: dates => object(dates) && Object.entries(dates).every(([key, date]) => ['25', '50', '75', '100'].includes(key) && text(date) && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= goal.startedAt) }),
      weightHistory: list(row => object(row) && text(row.date) && numeric(row.weight) && fields(row, { imc: numeric }))
    }),
    treino_profiles: map(plan),
    treino_session_log: map(list(entry)),
    treino_exercise_history: map(entry),
    treino_water_log: map(numeric),
    treino_checkins: map(value => day(value) || bool(value)),
    treino_daily_completion: map(map(bool)),
    treino_hints_seen: map(bool),
    treino_settings: value => fields(value, {
      restSeconds: numeric, restAutoStart: bool, restSound: bool, restVibrate: bool,
      trainingReminders: bool, restBackgroundNotification: bool, restBackgroundHintShown: bool
    }),
    treino_workout_meta: map(value => fields(value, { inicio: text, fim: text, minutos: numeric })),
    treino_workout_draft: value => fields(value, {
      date: text, profileId: text, workoutKey: day, formData: map(entry)
    }),
    treino_gamification: value => fields(value, {
      totalXP: number, longestStreak: number, bigWeightJump: bool,
      checkins: map(row => fields(row, { amount: number, full: bool })),
      waterBonus: map(bool), streakBonuses: map(bool), freeMealRewards: map(bool),
      unlockedAchievements: map(text), birthdayGreeted: map(bool), nightCheckins: map(bool), equippedProfiles: map(bool)
    })
  };
  // Recusa propriedades perigosas inclusive em extensões desconhecidas de backups antigos.
  function safeTree(value, depth = 0) {
    if (depth > 30) return false;
    if (!value || typeof value !== 'object') return true;
    return Object.entries(value).every(([key, child]) =>
      !['__proto__', 'constructor', 'prototype'].includes(key) && safeTree(child, depth + 1));
  }
  return {
  isValidEnvelope(value) {
    return fields(value, { exportedAt: text, appVersion: text }) &&
      value.app === 'treino-personalizado' && value.backupVersion === 1;
  },
  isValidData(data, allowedKeys, jsonKeys) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) return false;
    return Object.entries(data).every(([key, raw]) => {
      if (!allowedKeys.includes(key) || typeof raw !== 'string') return false;
      if (!jsonKeys.has(key)) return true;
      try {
        const parsed = JSON.parse(raw);
        return object(parsed) && safeTree(parsed) && !!schemas[key] && schemas[key](parsed);
      } catch (_) { return false; }
    });
  },

  summarize(data, getLevel) {
    let checkinCount = 0, sessionCount = 0, level = 1;
    try { checkinCount = Object.keys(JSON.parse(data.treino_checkins || '{}')).length; } catch (_) {}
    try {
      const log = JSON.parse(data.treino_session_log || '{}');
      sessionCount = Object.values(log).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);
    } catch (_) {}
    try { level = getLevel(JSON.parse(data.treino_gamification || '{}').totalXP || 0).level; } catch (_) {}
    return { checkinCount, sessionCount, level };
  }
  };
})();
