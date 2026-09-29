import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function load(path, name) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'), context);
  return context.window[name];
}

test('consulta reúne nomes equivalentes, desempata por carga e lê histórico substituído', async () => {
  const module = await load('js/core/history-queries.js', 'TREINO_HISTORY_QUERIES');
  let sessions = { a: [{ date: '2026-09-28', name: 'Elevação', weight: 10 }],
    b: [{ date: '2026-09-28', name: ' ELEVACAO ', weight: 15 },
      { date: '2026-09-29', name: 'Elevação', weight: 20 }] };
  const api = module.create({ getSessionLog: () => sessions, getExerciseHistory: () => ({}),
    getProfiles: () => ({}), compareByDate: (a, b) => a.date.localeCompare(b.date) });
  const result = api.collectSessionsForExercise('a', 'Elevação');
  expect(result.sessions.map(e => e.weight)).toEqual([15, 20]);
  expect(result.fromOtherProfiles).toBe(true);
  sessions = { restored: [{ date: '2026-09-30', name: 'Elevação', weight: 25 }] };
  expect(api.getLastSessionForExercise('a', 'Elevação').weight).toBe(25);
});

test('migração marca dia opcional e limpa registros inválidos uma única vez', async () => {
  const module = await load('js/core/initial-migrations.js', 'TREINO_INITIAL_MIGRATIONS');
  const flags = {}, saveJSON = vi.fn(), saveSessionLog = vi.fn();
  const profiles = { existing: { schedule: { DOM: { name: 'Extra (Opcional)', exercises: [] } } } };
  const sessions = { a: [{ date: '' }, { date: '2026-09-29' }], empty: [{ date: '' }] };
  const api = module.create({ getSessionLog: () => sessions, getProfiles: () => profiles,
    loadString: key => flags[key], saveString: (key, value) => { flags[key] = value; },
    saveJSON, saveSessionLog, entryDateKey: entry => entry.date,
    compareByDate: (a, b) => a.date.localeCompare(b.date), DAY_ORDER: ['DOM'], PROFILES_KEY: 'profiles' });
  api.migrateOptionalDays(); api.sanitizeSessionLog();
  api.migrateOptionalDays(); api.sanitizeSessionLog();
  expect(profiles.existing.schedule.DOM.optional).toBe(true);
  expect(sessions).toEqual({ a: [{ date: '2026-09-29' }] });
  expect(saveJSON).toHaveBeenCalledOnce();
  expect(saveSessionLog).toHaveBeenCalledOnce();
});

test('estimativa usa peso atual e corrige duração medida curta demais', async () => {
  const module = await load('js/core/workout-calories.js', 'TREINO_WORKOUT_CALORIES');
  let profile = { weight: 60 };
  const api = module.create({ getSettings: () => ({ restSeconds: 90 }), getUserProfile: () => profile,
    getEntrySeries: entry => entry.series || [], SEGUNDOS_POR_SERIE: 45,
    metDoCardio: () => 6, metDaForca: () => 5 });
  const workout = { minutos: 1, exercicios: [{ sets: 4 }] };
  expect(api.estimateWorkoutCalories(workout)).toEqual({ kcal: 45, medido: false, metForca: 5 });
  profile = { weight: 80 };
  expect(api.estimateWorkoutCalories(workout).kcal).toBe(60);
  profile = { weight: '' };
  expect(api.estimateWorkoutCalories(workout)).toBeNull();
});

test('dia só de opcionais exige alguma conclusão; dia misto exige todos os obrigatórios', async () => {
  const module = await load('js/ui/workout-controls.js', 'TREINO_WORKOUT_CONTROLS');
  const element = { addEventListener: vi.fn() };
  let exercises = [{ id: 'a', optional: true }], data = {};
  const api = module.create({ document: { getElementById: () => element }, window: {},
    btnGenerate: element, btnCopy: element, workoutSelect: element,
    getActiveProfile: () => ({ schedule: { SEG: { exercises } } }),
    getActiveWorkoutKey: () => 'SEG', getFormData: () => data, saveProfile: vi.fn() });
  expect(api.areAllExercisesDoneForActiveWorkout()).toBe(false);
  data = { a: { done: true } };
  expect(api.areAllExercisesDoneForActiveWorkout()).toBe(true);
  exercises = [{ id: 'a', optional: true }, { id: 'b' }];
  expect(api.areAllExercisesDoneForActiveWorkout()).toBe(false);
  data = { b: { done: true } };
  expect(api.areAllExercisesDoneForActiveWorkout()).toBe(true);
});
