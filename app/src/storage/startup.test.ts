import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { LEGACY_FIXTURE } from '../domain/legacy/fixture';
import { loadOrMigrate } from './startup';
import { loadLegacySnapshot, openAppDb } from './app-db';
import { readLegacySource } from './legacy-source';
import { idbPut, openDb } from './idb';

let idb: IDBFactory;
beforeEach(() => { idb = new IDBFactory(); });

const storageOf = (values: Record<string, string>) => ({ getItem: (k: string) => values[k] ?? null });

/** Recria o banco do app antigo como a 2.x o deixava. */
async function seedLegacyDb(log: object, last: object) {
  const db = await openDb('treino-session-log', 1, d => d.createObjectStore('state'), idb);
  await idbPut(db, 'state', 'current', log);
  await idbPut(db, 'state', 'exerciseHistory', last);
  db.close();
}

const NOW = new Date(2026, 9, 4, 12);

test('aparelho sem nada do app antigo começa vazio', async () => {
  const result = await loadOrMigrate({ storage: storageOf({}), idb }, NOW);
  expect(result.kind).toBe('fresh');
  expect(result.data.workouts).toEqual([]);
  expect((await loadOrMigrate({ storage: storageOf(LEGACY_FIXTURE), idb }, NOW)).kind).toBe('existing');
});

test('migra na primeira abertura, guarda a cópia bruta e não migra de novo', async () => {
  const first = await loadOrMigrate({ storage: storageOf(LEGACY_FIXTURE), idb }, NOW);
  expect(first.kind).toBe('migrated');
  if (first.kind !== 'migrated') return;
  expect(first.report.workouts).toBe(7);

  const db = await openAppDb(idb);
  const snapshot = await loadLegacySnapshot(db);
  db.close();
  expect(snapshot?.raw).toEqual(LEGACY_FIXTURE);
  expect(snapshot?.takenAt).toBe(NOW.toISOString());

  const second = await loadOrMigrate({ storage: storageOf({}), idb }, NOW);
  expect(second).toEqual({ kind: 'existing', data: first.data });
});

test('histórico do IndexedDB antigo prevalece sobre a cópia do localStorage', async () => {
  const onlyInDb = { ex9: [{ type: 'forca', name: 'Remada Curvada', series: [{ reps: 10, weight: 50 }], date: '2026-10-01' }] };
  await seedLegacyDb(onlyInDb, {});
  const raw = await readLegacySource({ storage: storageOf(LEGACY_FIXTURE), idb });
  expect(JSON.parse(raw.treino_session_log!)).toEqual(onlyInDb);
  expect(raw.treino_profiles).toBe(LEGACY_FIXTURE.treino_profiles);

  const result = await loadOrMigrate({ storage: storageOf(LEGACY_FIXTURE), idb }, NOW);
  expect(result.data.workouts.map(w => w.date)).toEqual(['2026-10-01']);
});

test('sem IndexedDB antigo, usa o histórico do localStorage sem criar o banco antigo', async () => {
  const raw = await readLegacySource({ storage: storageOf(LEGACY_FIXTURE), idb });
  expect(raw.treino_session_log).toBe(LEGACY_FIXTURE.treino_session_log);
  expect((await idb.databases()).map(d => d.name)).not.toContain('treino-session-log');
});
