import { test, expect, vi, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function load(file, name) {
  const context = vm.createContext({ window: {}, Date, console: { error: vi.fn(), warn: vi.fn() } });
  vm.runInContext(await readFile(new URL(`../../js/core/${file}.js`, import.meta.url), 'utf8'), context);
  return context.window[name];
}
afterEach(() => vi.useRealTimers());

test('gravação local bloqueia restauração e avisa quota apenas uma vez', async () => {
  const module = await load('local-persistence', 'TREINO_LOCAL_PERSISTENCE');
  let restoring = true;
  const setItem = vi.fn(), toast = vi.fn(), invalidate = vi.fn();
  const api = module.create({ getStorage: () => ({ setItem }), storageAvailable: true,
    isRestoringBackup: () => restoring, invalidateVolume: invalidate, showToast: toast });
  expect(api.saveJSON('treino_session_log', {})).toBe(false);
  expect(setItem).not.toHaveBeenCalled();
  restoring = false;
  expect(api.saveJSON('treino_session_log', { exercise: [] })).toBe(true);
  expect(invalidate).toHaveBeenCalledOnce();
  setItem.mockImplementation(() => { throw new Error('QuotaExceededError'); });
  expect(api.saveJSON('profile', {})).toBe(false);
  expect(api.saveJSON('profile', {})).toBe(false);
  expect(toast).toHaveBeenCalledOnce();
});

test('duração preserva início, lê estado substituído e rejeita treino acima de oito horas', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  const module = await load('workout-duration', 'TREINO_WORKOUT_DURATION');
  let meta = {};
  const api = module.create({ getWorkoutMeta: () => meta, todayKey: () => '2026-09-29',
    saveJSON: vi.fn(), WORKOUT_META_KEY: 'meta' });
  expect(api.markWorkoutEnd()).toBeNull();
  api.markWorkoutStart();
  vi.advanceTimersByTime(65 * 60000);
  api.markWorkoutStart();
  expect(api.markWorkoutEnd()).toBe(65);
  expect(api.formatDuration(65)).toBe('1h05');
  meta = { '2026-09-29': { inicio: '2026-09-29T00:00:00Z' } };
  expect(api.markWorkoutEnd()).toBeNull();
});

function storageDeps(window) {
  let sessions = { original: [] }, history = { original: {} };
  return { window, getSessionLog: () => sessions, setSessionLog: value => { sessions = value; },
    getExerciseHistory: () => history, setExerciseHistory: value => { history = value; },
    isRestoringBackup: () => false, invalidateVolume: vi.fn(), saveJSON: vi.fn(() => true),
    SESSIONS_KEY: 'sessions', HISTORY_KEY: 'history' };
}

test('histórico usa fallback local e lê os dados atuais quando IndexedDB não existe', async () => {
  const module = await load('history-storage', 'TREINO_HISTORY_STORAGE');
  const deps = storageDeps({});
  const api = module.create(deps);
  await api.initializeSessionLogStorage();
  deps.setSessionLog({ restored: [] });
  deps.setExerciseHistory({ restored: { weight: 20 } });
  expect(api.saveSessionLog()).toBe(true);
  expect(api.saveExerciseHistory()).toBe(true);
  expect(deps.saveJSON).toHaveBeenCalledWith('sessions', { restored: [] });
  expect(deps.saveJSON).toHaveBeenCalledWith('history', { restored: { weight: 20 } });
});

test('limpar banco durante abertura impede histórico antigo de substituir dados restaurados', async () => {
  const module = await load('history-storage', 'TREINO_HISTORY_STORAGE');
  const open = {}, deletion = {};
  const deps = storageDeps({ indexedDB: { open: () => open, deleteDatabase: () => deletion } });
  const api = module.create(deps);
  const pending = api.initializeSessionLogStorage();
  const cleared = api.clearSessionDb();
  deletion.onsuccess();
  await cleared;
  deps.setSessionLog({ restored: [] });
  const db = { close: vi.fn(), transaction: vi.fn() };
  open.result = db;
  open.onsuccess();
  await pending;
  expect(db.close).toHaveBeenCalledOnce();
  expect(db.transaction).not.toHaveBeenCalled();
  expect(deps.getSessionLog()).toEqual({ restored: [] });
});
