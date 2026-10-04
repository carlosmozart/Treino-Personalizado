// Acesso ao banco do app novo usado pela store, com a conexão aberta uma vez só.
import type { AppData } from '../domain/model';
import type { ActiveSession } from '../domain/session';
import { loadCloudState, loadSession, openAppDb, saveAppData, saveCloudState, saveSession } from './app-db';
import type { CloudState } from '../sync/controller';

export interface Repository {
  saveData(data: AppData): Promise<void>;
  loadSession(): Promise<ActiveSession | null>;
  saveSession(session: ActiveSession | null): Promise<void>;
  loadCloudState(): Promise<CloudState>;
  saveCloudState(state: CloudState): Promise<void>;
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
    saveSession: async session => saveSession(await open(), session),
    loadCloudState: async () => loadCloudState(await open()),
    saveCloudState: async state => saveCloudState(await open(), state)
  };
}
