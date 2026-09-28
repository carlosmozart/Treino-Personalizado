window.TREINO_PROFILES = {
  recordGoalCheckpoints(goal, current, date) {
    const progress = this.goalProgress(goal.startWeight, current, goal.targetWeight);
    if (!progress) return goal;
    const checkpoints = { ...(goal.checkpoints || {}) };
    for (const point of progress.checkpoints) {
      if (point.reached && !checkpoints[point.percent]) checkpoints[point.percent] = date;
    }
    return { ...goal, checkpoints };
  },
  weightTrend(entries) {
    // Janela por registros, não por dias: não inventa medições entre pesagens.
    const valid = entries.filter(e => Number.isFinite(Number(e.weight)) && Number(e.weight) > 0);
    return valid.map((entry, index) => {
      const recent = valid.slice(Math.max(0, index - 6), index + 1);
      return { ...entry, weight: Number(entry.weight), trendCount: recent.length,
        trend: recent.reduce((sum, e) => sum + Number(e.weight), 0) / recent.length };
    });
  },
  goalProgress(start, current, target) {
    if (![start, current, target].every(n => Number.isFinite(n) && n > 0)) return null;
    const distance = target - start;
    const maintenance = Math.abs(distance) < 0.1;
    const percent = maintenance ? (Math.abs(current - target) < 0.1 ? 100 : 0)
      : Math.max(0, Math.min(100, (current - start) / distance * 100));
    return { percent, maintenance, remaining: Math.abs(target - current),
      checkpoints: maintenance ? [] : [25, 50, 75, 100].map(value => ({
        percent: value, weight: start + distance * value / 100, reached: percent + 1e-8 >= value
      })) };
  },
  numericError(field, value) {
    if (value === '') return '';
    const labels = { height: 'Altura', weight: 'Peso', targetWeight: 'Peso alvo', bodyFatPercent: 'Gordura corporal' };
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return `${labels[field]} deve ser um número maior que zero.`;
    if (field === 'bodyFatPercent' && number >= 100) return 'Gordura corporal deve ser menor que 100%.';
    return '';
  },
  active(profiles, activeProfileId) { return profiles[activeProfileId] || null; },
  has(profiles, profileId) { return !!profiles[profileId]; },
  isRestDay(profile, date, dayKeys) {
    if (!profile) return false;
    const workout = profile.schedule && profile.schedule[dayKeys[date.getDay()]];
    return !!(workout && (workout.optional || !(workout.exercises || []).length));
  }
};
