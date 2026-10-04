import { expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createAppStore } from './app-store';
import { idbRepository } from '../storage/repository';
import { loadOrMigrate } from '../storage/startup';
import { loadAppData, openAppDb, saveAppData } from '../storage/app-db';
import { addWater } from '../domain/actions';
import { completeExercise } from '../domain/session';
import { sampleData } from '../domain/testing';

const MONDAY = new Date(2026, 9, 5, 10, 0);

async function setup(idb = new IDBFactory()) {
  const db = await openAppDb(idb);
  await saveAppData(db, sampleData());
  db.close();
  let id = 0;
  let clock = MONDAY;
  const deps = { load: () => loadOrMigrate({ storage: null, idb }), repo: idbRepository(idb), now: () => clock, makeId: () => `s${++id}`, saveDelay: 0 };
  const store = createAppStore(deps);
  await store.getState().init();
  return { store, idb, deps, setClock: (d: Date) => { clock = d; } };
}

async function savedData(idb: IDBFactory) {
  const db = await openAppDb(idb);
  try { return await loadAppData(db); } finally { db.close(); }
}

test('abre os dados salvos e grava as ações', async () => {
  const { store, idb } = await setup();
  expect(store.getState()).toMatchObject({ status: 'ready', startup: { kind: 'existing' }, session: null });
  store.getState().run((data, now) => addWater(data, 500, now));
  expect(store.getState().data!.water['2026-10-05']).toBe(500);
  await store.getState().flush();
  expect((await savedData(idb))!.water['2026-10-05']).toBe(500);
});

test('treino em andamento sobrevive a fechar o app e finalizar grava treino e recompensas', async () => {
  const first = await setup();
  expect(first.store.getState().startWorkout('p1', 'SEG')).toBe(true);
  first.store.getState().updateSession(s => completeExercise(completeExercise(s, 0), 1));
  await first.store.getState().flush();

  // "reabre o app" com o mesmo banco
  const store = createAppStore(first.deps);
  await store.getState().init();
  expect(store.getState().session?.exercises[0]!.sets.every(set => set.done)).toBe(true);

  first.setClock(new Date(MONDAY.getTime() + 45 * 60000));
  expect(store.getState().finishWorkout()).toBe('saved');
  expect(store.getState().session).toBeNull();
  expect(store.getState().takeEvents().map(e => e.kind)).toEqual(['xp', 'level-up']);
  expect(store.getState().events).toEqual([]);
  await store.getState().flush();
  const saved = await savedData(first.idb);
  expect(saved!.workouts).toHaveLength(1);
  expect(saved!.workouts[0]!.durationMin).toBe(45);
  expect(await first.deps.repo.loadSession()).toBeNull();
});

test('finalizar sem séries marcadas mantém a sessão; descartar apaga', async () => {
  const { store, deps } = await setup();
  store.getState().startWorkout('p1', 'SEG');
  expect(store.getState().finishWorkout()).toBe('empty');
  expect(store.getState().session).not.toBeNull();
  store.getState().discardWorkout();
  await store.getState().flush();
  expect(await deps.repo.loadSession()).toBeNull();
  expect(store.getState().finishWorkout()).toBe('no-session');
});

test('falha ao abrir vira estado de erro; falha ao gravar fica visível', async () => {
  const broken = createAppStore({ load: () => Promise.reject(new Error('Versão de dados desconhecida: 9')), repo: idbRepository(new IDBFactory()) });
  await broken.getState().init();
  expect(broken.getState()).toMatchObject({ status: 'error', error: 'Versão de dados desconhecida: 9' });

  const { store, deps } = await setup();
  deps.repo.saveData = () => Promise.reject(new Error('QuotaExceededError'));
  const failing = createAppStore(deps);
  await failing.getState().init();
  failing.getState().run((data, now) => addWater(data, 500, now));
  await failing.getState().flush();
  expect(failing.getState().saveError).toBe('QuotaExceededError');
  expect(store.getState().saveError).toBeNull();
});
