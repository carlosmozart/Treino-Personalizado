window.TREINO_VOLUME = {
  total(sessionLog, sessionVolume) {
    let total = 0;
    Object.keys(sessionLog).forEach(key => (sessionLog[key] || []).forEach(entry => { total += sessionVolume(entry); }));
    return Math.round(total);
  }
};
