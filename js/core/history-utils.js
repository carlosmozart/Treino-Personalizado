// Agregação pura do histórico. A interface fornece as regras específicas do perfil.
window.TREINO_HISTORY = {
  buildWorkoutHistory(sessionLog, checkins, workoutMeta, deps) {
    const byDate = {};
    Object.keys(sessionLog).forEach(historyKey => {
      (sessionLog[historyKey] || []).forEach(entry => {
        const date = deps.entryDateKey(entry);
        if (!date) return;
        if (!byDate[date]) byDate[date] = { date, exercicios: [], volume: 0 };
        byDate[date].exercicios.push(Object.assign({}, entry, { date, historyKey, name: deps.resolveExerciseName(historyKey, entry) }));
        byDate[date].volume += deps.sessionVolume(entry);
      });
    });
    Object.keys(byDate).forEach(date => {
      const workoutKey = checkins[date];
      byDate[date].workoutKey = workoutKey || null;
      byDate[date].workoutName = deps.resolveWorkoutName(workoutKey, date);
      byDate[date].minutos = (workoutMeta[date] && workoutMeta[date].minutos) || null;
    });
    return Object.values(byDate).sort((a, b) => deps.compareByDate(b, a));
  }
};
