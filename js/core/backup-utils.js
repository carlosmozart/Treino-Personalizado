window.TREINO_BACKUP = {
  build({ keys, storageAvailable, sessionKey, historyKey, sessionLog, exerciseHistory, appVersion }) {
    const data = {};
    keys.forEach(key => {
      const raw = storageAvailable ? localStorage.getItem(key) : null;
      if (raw !== null) data[key] = raw;
    });
    data[sessionKey] = JSON.stringify(sessionLog);
    data[historyKey] = JSON.stringify(exerciseHistory);
    return { app: 'treino-personalizado', backupVersion: 1, appVersion, exportedAt: new Date().toISOString(), data };
  }
};
