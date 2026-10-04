// Abertura dos dados na inicialização: usa o AppData salvo ou, na primeira abertura depois da
// troca de versão, migra o que o app antigo deixou no aparelho.
import { emptyAppData, type AppData } from '../domain/model';
import { parseLegacyData } from '../domain/legacy/validate';
import { migrateLegacy, type MigrationReport } from '../domain/legacy/migrate';
import { loadAppData, loadLegacySnapshot, openAppDb, saveAppData, saveLegacySnapshot } from './app-db';
import { hasLegacyData, readLegacySource, type LegacySourceDeps } from './legacy-source';

export type StartupResult =
  | { kind: 'existing'; data: AppData }
  | { kind: 'migrated'; data: AppData; report: MigrationReport }
  | { kind: 'fresh'; data: AppData };

export async function loadOrMigrate(deps: LegacySourceDeps & { idb: IDBFactory }, now = new Date()): Promise<StartupResult> {
  const db = await openAppDb(deps.idb);
  try {
    const saved = await loadAppData(db);
    if (saved) return { kind: 'existing', data: saved };

    const raw = await readLegacySource(deps);
    if (!hasLegacyData(raw)) {
      const data = emptyAppData();
      await saveAppData(db, data);
      return { kind: 'fresh', data };
    }

    // Cópia bruta antes de qualquer conversão; uma cópia já existente nunca é sobrescrita.
    if (!(await loadLegacySnapshot(db))) await saveLegacySnapshot(db, { takenAt: now.toISOString(), raw });
    const { data, report } = migrateLegacy(parseLegacyData(raw), now);
    await saveAppData(db, data);
    return { kind: 'migrated', data, report };
  } finally {
    db.close();
  }
}
