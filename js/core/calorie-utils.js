window.TREINO_CALORIES = {
  cardioMet(entry, defaultMet) {
    const min = parseFloat(entry.duration) || 0, km = parseFloat(entry.distance) || 0;
    if (!min || !km) return defaultMet;
    const kmh = km / (min / 60);
    if (kmh < 5.5) return 3.5;
    if (kmh < 6.5) return 5.0;
    if (kmh < 8) return 7.0;
    if (kmh < 10) return 9.0;
    if (kmh < 12) return 11.0;
    return 12.5;
  },
  strengthMet(exercises, weight, minutes, getSeries, defaultMet) {
    let sets = 0, reps = 0, volume = 0;
    exercises.forEach(exercise => {
      if (exercise.type === 'cardio') return;
      getSeries(exercise).forEach(series => {
        const r = parseFloat(series.reps) || 0, load = parseFloat(series.weight) || 0;
        sets++; reps += r; volume += r * load;
      });
    });
    if (!sets) return defaultMet;
    const relativeLoad = reps && weight ? volume / reps / weight : 0.25;
    const density = minutes ? sets / minutes : 0.12;
    return Math.max(4.2, Math.min(6.0, 4.1 + Math.min(1.4, Math.max(0, relativeLoad) * 1.25) + Math.min(0.5, density * 2)));
  }
};
