// Acesso ao banco do app novo usado pela store, com a conexão aberta uma vez só.
import type { AppData } from '../domain/model';
import type { ActiveSession } from '../domain/session';
import { loadSession, openAppDb, saveAppData, saveSession } from './app-db';

export interface Repository {
  saveData(data: AppData): Promise<void>;
  loadSession(): Promise<ActiveSession | null>;
  saveSession(session: ActiveSession | null): Promise<void>;
}

/** O banco só é aberto no primeiro uso (importar o módulo não toca no IndexedDB). */
export function idbRepository(factory?: IDBFactory): Repository {
  let db: Promise<IDBDatabase> | null = null;
  const open = () => (db ??= openAppDb(factory ?? indexedDB).then(conn => {
    conn.onversionchange = () => { conn.close(); db = null; };
    return conn;
  }));
  return {
    saveData: async data => saveAppData(await open(), data),
    loadSession: async () => (await loadSession(await open())) ?? null,
    saveSession: async session => saveSession(await open(), session)
  };
}
