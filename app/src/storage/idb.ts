// Ajudantes mínimos de IndexedDB com Promises.

export function openDb(name: string, version: number, upgrade: (db: IDBDatabase) => void, factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function idbGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export function idbPut(db: IDBDatabase, store: string, key: IDBValidKey, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Verdadeiro se o banco existe, sem criá-lo (abrir um banco inexistente o criaria vazio). */
export async function dbExists(name: string, factory: IDBFactory = indexedDB): Promise<boolean> {
  if (typeof factory.databases === 'function') {
    const list = await factory.databases();
    return list.some(db => db.name === name);
  }
  return true; // sem como listar: quem chama trata o banco vazio
}
