import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/core/series-utils.js', import.meta.url), 'utf8'), context);
const api = context.window.TREINO_SERIES.create({ getEntrySeries: entry => entry.series || [] });

test('preenche pelo histórico repetindo a última série sem copiar conclusão', () => {
  const saved = { series: [{ reps: 12, weight: 0, done: true }, { reps: 8, weight: 30 }] };
  expect(api.buildSeriesFromHistory({}, saved, 3)).toEqual([
    { reps: 12, weight: 0, done: false }, { reps: 8, weight: 30, done: false },
    { reps: 8, weight: 30, done: false }
  ]);
  expect(saved.series[0].done).toBe(true);
  expect(api.buildSeriesFromHistory({ targetSets: 2, targetReps: '15', targetWeight: '10' }, null)).toEqual([
    { reps: 15, weight: 10, done: false }, { reps: 15, weight: 10, done: false }
  ]);
});

test('adicionar série herda valores mas não conclusão; redução respeita quantidade', () => {
  const state = { sets: 3, series: [{ reps: 10, weight: 0, done: true }] };
  expect(api.getSeries(state, null)).toEqual([
    { reps: 10, weight: 0, done: true }, { reps: 10, weight: 0, done: false },
    { reps: 10, weight: 0, done: false }
  ]);
  state.sets = 1;
  expect(api.getSeries(state, null)).toHaveLength(1);
  state.sets = 0;
  expect(api.getSeries(state, null)).toEqual([]);
});

test('estado legado sem array de séries mantém valores e campos compatíveis', () => {
  const state = { sets: 2, reps: 8, weight: 25 };
  api.getSeries(state, null);
  state.series[0] = { reps: 6, weight: 30 };
  api.syncLegacyFields(state);
  expect(state).toMatchObject({ sets: 2, reps: 6, weight: 30 });
  const empty = { sets: 0, reps: 8, weight: 25, series: [] };
  api.syncLegacyFields(empty);
  expect(empty.reps).toBe(8);
});

test('migra seriesDone uma única vez sem perder marcações atuais', () => {
  const state = { sets: 2, series: [{ reps: 10, weight: 20 }, { reps: 8, weight: 25, done: true }],
    seriesDone: [true, false, true] };
  expect(api.getSeriesDone(state)).toEqual([true, true]);
  expect(state.seriesDone).toBeUndefined();
  state.series[0].done = false;
  expect(api.getSeriesDone(state)).toEqual([false, true]);
});
