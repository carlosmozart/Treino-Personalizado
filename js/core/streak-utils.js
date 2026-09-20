window.TREINO_STREAK = {
  calculate({ checkins, isRestDay, formatDateKey, now = new Date(), maxLookbackDays = 730 }) {
    let streak = 0, firstDay = true;
    const day = new Date(now); day.setHours(0, 0, 0, 0);
    for (let index = 0; index < maxLookbackDays; index++) {
      const key = formatDateKey(day);
      if (checkins[key]) streak++;
      else if (!firstDay && !isRestDay(day)) break;
      firstDay = false;
      day.setDate(day.getDate() - 1);
    }
    return streak;
  }
};
