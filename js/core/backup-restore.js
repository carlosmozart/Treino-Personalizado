// O journal durável permite desfazer alterações locais após erro ou interrupção.
// Os dois históricos e a remoção do journal são confirmados na mesma transação.
window.TREINO_BACKUP_RESTORE = (() => {
  const marker = 'treino_restore_pending';
  const journalKey = 'backupRestoreJournal';
  const storeName = 'state';

  function transaction(db, operation) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Restauração interrompida'));
      tx.onerror = () => {}; // onabort confirma que nenhuma escrita foi efetivada.
      try { operation(tx.objectStore(storeName)); }
      catch (error) { tx.abort(); reject(error); }
    });
  }

  function readJournal(db) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(journalKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function replaceLocal(storage, keys, values) {
    // Libera primeiro o espaço ocupado; rollback usa o mesmo procedimento.
    keys.forEach(key => storage.removeItem(key));
    keys.forEach(key => {
      if (values[key] !== null && values[key] !== undefined) storage.setItem(key, values[key]);
    });
  }

  async function recover({ storage, openDatabase }) {
    if (!storage.getItem(marker)) return false;
    const db = await openDatabase();
    try {
      const journal = await readJournal(db);
      if (journal) {
        replaceLocal(storage, journal.keys, journal.previous);
        await transaction(db, store => store.delete(journalKey));
      }
      // Sem journal, o commit dos históricos já terminou, ou não houve alterações.
      storage.removeItem(marker);
      return true;
    } finally { db.close(); }
  }

  async function restore({ data, keys, sessionKey, historyKey, storage, openDatabase }) {
    await recover({ storage, openDatabase });
    const sessions = JSON.parse(data[sessionKey] || '{}');
    const history = JSON.parse(data[historyKey] || '{}');
    const previous = Object.fromEntries(keys.map(key => [key, storage.getItem(key)]));
    const localData = { ...data, [sessionKey]: null, [historyKey]: null };
    const db = await openDatabase(); // Sem IndexedDB, recusa sem alterar os dados.
    let committed = false;
    try {
      await transaction(db, store => store.put({ keys, previous }, journalKey));
      storage.setItem(marker, '1');
      replaceLocal(storage, keys, localData);
      await transaction(db, store => {
        store.put(sessions, 'current');
        store.put(history, 'exerciseHistory');
        store.delete(journalKey);
      });
      committed = true;
      storage.removeItem(marker);
    } catch (error) {
      if (committed) return; // A próxima abertura apenas remove o marcador residual.
      try {
        if (storage.getItem(marker)) replaceLocal(storage, keys, previous);
        await transaction(db, store => store.delete(journalKey));
        storage.removeItem(marker);
      } catch (recoveryError) {
        error.recoveryRequired = true;
        error.cause = recoveryError;
      }
      throw error;
    } finally { db.close(); }
  }

  return { restore, recover, marker };
})();
