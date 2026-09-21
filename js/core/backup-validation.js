// Validação e resumo puros de backups. A interface decide como exibir erros e confirmações.
window.TREINO_BACKUP_VALIDATION = {
  isValidData(data, allowedKeys, jsonKeys) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) return false;
    return Object.entries(data).every(([key, raw]) => {
      if (!allowedKeys.includes(key) || typeof raw !== 'string') return false;
      if (!jsonKeys.has(key)) return true;
      try {
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
        if (key === 'treino_session_log') return Object.values(parsed).every((entries) =>
          Array.isArray(entries) && entries.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
        );
        if (key === 'treino_profiles') return Object.values(parsed).every((profile) =>
          profile && typeof profile === 'object' && !Array.isArray(profile) &&
          profile.schedule && typeof profile.schedule === 'object' && !Array.isArray(profile.schedule)
        );
        return true;
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
