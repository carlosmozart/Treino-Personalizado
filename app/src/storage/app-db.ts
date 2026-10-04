// Banco do app novo: o documento AppData e a cópia bruta dos dados antigos.
import { SCHEMA_VERSION, type AppData } from '../domain/model';
import { normalizeAppData } from '../domain/sync';
import type { ActiveSession } from '../domain/session';
import { idbDelete, idbGet, idbPut, openDb } from './idb';

export const APP_DB = 'treino-app';
const STORE = 'data';
const DATA_KEY = 'app';
const LEGACY_SNAPSHOT_KEY = 'legacy-snapshot';
/** Treino em andamento: fica à parte porque é gravado a cada toque. */
const SESSION_KEY = 'session';

export interface LegacySnapshot {
  takenAt: string;
  raw: Record<string, string>;
}

export function openAppDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return openDb(APP_DB, 1, db => db.createObjectStore(STORE), factory);
}

export async function loadAppData(db: IDBDatabase): Promise<AppData | null> {
  const data = await idbGet<AppData>(db, STORE, DATA_KEY);
  if (!data) return null;
  if (data.schemaVersion !== SCHEMA_VERSION) throw new Error(`Versão de dados desconhecida: ${String(data.schemaVersion)}`);
  return normalizeAppData(data, new Date());
}

export function saveAppData(db: IDBDatabase, data: AppData): Promise<void> {
  return idbPut(db, STORE, DATA_KEY, data);
}

export function loadLegacySnapshot(db: IDBDatabase): Promise<LegacySnapshot | undefined> {
  return idbGet<LegacySnapshot>(db, STORE, LEGACY_SNAPSHOT_KEY);
}

export function saveLegacySnapshot(db: IDBDatabase, snapshot: LegacySnapshot): Promise<void> {
  return idbPut(db, STORE, LEGACY_SNAPSHOT_KEY, snapshot);
}

export function loadSession(db: IDBDatabase): Promise<ActiveSession | undefined> {
  return idbGet<ActiveSession>(db, STORE, SESSION_KEY);
}

export function saveSession(db: IDBDatabase, session: ActiveSession | null): Promise<void> {
  return session ? idbPut(db, STORE, SESSION_KEY, session) : idbDelete(db, STORE, SESSION_KEY);
}
