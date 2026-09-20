window.TREINO_CHECKIN_XP = {
  full(daysPerWeek, weeklyPool) { return Math.max(20, Math.round(weeklyPool / (daysPerWeek || 6))); },
  half(fullXP) { return Math.round(fullXP / 2); },
  bonus(fullXP, percent) { return Math.max(1, Math.round(fullXP * percent)); }
};
