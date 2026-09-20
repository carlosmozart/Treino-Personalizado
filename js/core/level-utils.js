window.TREINO_LEVELS = {
  xpForLevel(level) { return 100 + (level - 1) * 15; },
  getLevelInfo(totalXP, maxLevel) {
    let level = 1, start = 0;
    while (level < maxLevel) { const need = this.xpForLevel(level); if (totalXP - start < need) break; start += need; level++; }
    const next = level < maxLevel ? this.xpForLevel(level) : 0;
    return { level, xpIntoLevel: totalXP - start, xpToNext: next, totalXP };
  }
};
