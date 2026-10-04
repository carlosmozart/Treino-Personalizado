// Leitura dos dados que o app antigo (≤ 2.x) deixou no aparelho. Somente leitura: nada do
// app antigo é alterado ou apagado. Mesmo endereço web e mesmo pacote Android = mesmo
// localStorage e IndexedDB.
import { LEGACY_KEYS } from '../domain/legacy/validate';
import { dbExists, idbGet, openDb } from './idb';

const LEGACY_DB = 'treino-session-log';
const LEGACY_STORE = 'state';

export interface LegacySourceDeps {
  storage: Pick<Storage, 'getItem'> | null;
  idb: IDBFactory | null;
}

/**
 * Monta o mesmo mapa chave → texto do backup v1. O histórico vem do IndexedDB quando existe
 * (era a fonte oficial desde a 2.13); o localStorage é a cópia de reserva do app antigo.
 */
export async function readLegacySource({ storage, idb }: LegacySourceDeps): Promise<Record<string, string>> {
  const raw: Record<string, string> = {};
  for (const key of LEGACY_KEYS) {
    try {
      const value = storage?.getItem(key);
      if (value !== null && value !== undefined) raw[key] = value;
    } catch { /* armazenamento bloqueado: segue com o que der */ }
  }

  if (idb && await dbExists(LEGACY_DB, idb)) {
    let db: IDBDatabase | null = null;
    try {
      db = await openDb(LEGACY_DB, 1, upgraded => upgraded.createObjectStore(LEGACY_STORE), idb);
      if (db.objectStoreNames.contains(LEGACY_STORE)) {
        const log = await idbGet<unknown>(db, LEGACY_STORE, 'current');
        const last = await idbGet<unknown>(db, LEGACY_STORE, 'exerciseHistory');
        if (log && typeof log === 'object') raw.treino_session_log = JSON.stringify(log);
        if (last && typeof last === 'object') raw.treino_exercise_history = JSON.stringify(last);
      }
    } catch { /* banco antigo ilegível: fica a cópia do localStorage */ }
    finally { db?.close(); }
  }
  return raw;
}

/** Há algo do app antigo para migrar? (perfil ou histórico) */
export function hasLegacyData(raw: Record<string, string>): boolean {
  return ['treino_user_profile', 'treino_session_log', 'treino_profiles', 'treino_checkins'].some(key => key in raw);
}
