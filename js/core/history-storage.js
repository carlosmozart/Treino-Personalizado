window.TREINO_HISTORY_STORAGE = {
  create({ window, getSessionLog, setSessionLog, getExerciseHistory, setExerciseHistory, isRestoringBackup, invalidateVolume, saveJSON, SESSIONS_KEY, HISTORY_KEY }) {
    const SESSION_DB_NAME = 'treino-session-log';
    const SESSION_DB_STORE = 'state';
    const SESSION_DB_KEY = 'current';
    const EXERCISE_HISTORY_DB_KEY = 'exerciseHistory';
    let sessionDb = null;
    let sessionDbReady = false;
    let sessionDbGeneration = 0;

    function openSessionDb() {
      if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB indisponível'));
      return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(SESSION_DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(SESSION_DB_STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    function readSessionDb(db, key = SESSION_DB_KEY) {
      return new Promise((resolve, reject) => {
        const request = db.transaction(SESSION_DB_STORE, 'readonly').objectStore(SESSION_DB_STORE).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    }

    function writeSessionDb() {
      if (!sessionDbReady || !sessionDb) return Promise.resolve(false);
      return new Promise((resolve, reject) => {
        const transaction = sessionDb.transaction(SESSION_DB_STORE, 'readwrite');
        transaction.objectStore(SESSION_DB_STORE).put(getSessionLog(), SESSION_DB_KEY);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    }

    function writeExerciseHistoryDb() {
      if (!sessionDbReady || !sessionDb) return Promise.resolve(false);
      return new Promise((resolve, reject) => {
        const transaction = sessionDb.transaction(SESSION_DB_STORE, 'readwrite');
        transaction.objectStore(SESSION_DB_STORE).put(getExerciseHistory(), EXERCISE_HISTORY_DB_KEY);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    }

    function clearSessionDb() {
      if (!('indexedDB' in window)) return Promise.resolve();
      sessionDbGeneration++;
      if (sessionDb) sessionDb.close();
      sessionDb = null;
      sessionDbReady = false;
      return new Promise(resolve => {
        const request = window.indexedDB.deleteDatabase(SESSION_DB_NAME);
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      });
    }

    function saveSessionLog() {
      if (isRestoringBackup()) return false;
      invalidateVolume();
      if (!sessionDbReady) return saveJSON(SESSIONS_KEY, getSessionLog());
      writeSessionDb().catch(error => {
        console.error('Falha ao gravar histórico no IndexedDB; usando armazenamento local.', error);
        sessionDbReady = false;
        saveJSON(SESSIONS_KEY, getSessionLog());
      });
      return true;
    }

    function saveExerciseHistory() {
      if (isRestoringBackup()) return false;
      if (!sessionDbReady) return saveJSON(HISTORY_KEY, getExerciseHistory());
      writeExerciseHistoryDb().catch(error => {
        console.error('Falha ao gravar histórico de exercícios no IndexedDB; usando armazenamento local.', error);
        sessionDbReady = false;
        saveJSON(HISTORY_KEY, getExerciseHistory());
      });
      return true;
    }

    async function initializeSessionLogStorage() {
      const generation = sessionDbGeneration;
      try {
        const db = await openSessionDb();
        // Uma restauração de backup pode ocorrer enquanto a abertura do banco ainda
        // está pendente. Nesse caso, descarta esta conexão antiga para que ela não
        // restaure por engano o histórico anterior ao backup.
        if (generation !== sessionDbGeneration) {
          db.close();
          return;
        }
        sessionDb = db;
        const stored = await readSessionDb(db);
        const storedExerciseHistory = await readSessionDb(db, EXERCISE_HISTORY_DB_KEY);
        if (generation !== sessionDbGeneration) {
          db.close();
          if (sessionDb === db) sessionDb = null;
          return;
        }
        sessionDbReady = true;
        if (stored && typeof stored === 'object') setSessionLog(stored);
        else await writeSessionDb();
        if (storedExerciseHistory && typeof storedExerciseHistory === 'object') setExerciseHistory(storedExerciseHistory);
        else await writeExerciseHistoryDb();
        // A cópia local continua sendo a rota de migração e backup desta versão.
        // Escritas novas passam a ir para o IndexedDB, que suporta históricos maiores.
      } catch (error) {
        console.warn('IndexedDB indisponível; histórico seguirá no armazenamento local.', error);
        sessionDbReady = false;
      }
    }

    return { openSessionDb, clearSessionDb, saveSessionLog, saveExerciseHistory, initializeSessionLogStorage };
  }
};
