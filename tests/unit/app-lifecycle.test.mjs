import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/ui/app-lifecycle.js', import.meta.url), 'utf8');
function setup(overrides = {}) {
  const context = vm.createContext({ window: {}, console: { error: vi.fn() } });
  vm.runInContext(source, context);
  const listeners = {}, nodes = {};
  const deps = {
    document: { body: {}, hidden: false, addEventListener: vi.fn(),
      getElementById: id => nodes[id] ||= {} },
    window: { addEventListener: (name, fn) => { listeners[name] = fn; }, location: { reload: vi.fn() } },
    navigator: {}, PLATFORM: { isNative: true }, todayKey: () => '2026-09-29',
    isRestoringBackup: () => false, perfilView: { classList: { contains: () => false } },
    workoutSelect: {}, setInterval: vi.fn(), TREINO_BACKUP_RESTORE: { recover: vi.fn() },
    localStorage: {}, openSessionDb: vi.fn(), storageAvailable: true,
    initializeHistory: vi.fn(async () => {}), syncTrainingReminders: vi.fn(async () => {}),
    getTodaysWorkoutKey: () => 'TER', APP_VERSION: '2.20.1',
    isProfileComplete: () => true, loadString: () => '2.20.1', LAST_SEEN_VERSION_KEY: 'version'
  };
  for (const name of ['renderWaterCard', 'renderIMCCard', 'renderMetabolismCard', 'clearDraft',
    'initializeWorkoutData', 'renderHeader', 'renderExercises', 'renderCheckinGrid',
    'checkBirthday', 'showToast', 'setupModalAccessibility', 'ensureProfilesSeeded',
    'migrateOptionalDays', 'resetHistoryCaches', 'sanitizeSessionLog', 'buildExerciseDatalist',
    'migrateHistoryToSessionLog', 'renderWorkoutSelectOptions', 'renderLevelBar',
    'renderNotificationSettings', 'switchView', 'showOnboarding', 'openNovidades',
    'saveString', 'maybeShowSwipeHint', 'maybeSuggestBackup']) deps[name] = vi.fn();
  Object.assign(deps, overrides);
  const api = context.window.TREINO_APP_LIFECYCLE.create(deps);
  return { deps, api, listeners };
}

test('aguarda o histórico antes de migrar, renderizar e liberar a interface', async () => {
  let finish;
  const history = new Promise(resolve => { finish = resolve; });
  const s = setup({ initializeHistory: () => history, isProfileComplete: () => false });
  const pending = s.listeners.DOMContentLoaded();
  expect(s.deps.document.body.inert).toBe(true);
  expect(s.deps.migrateHistoryToSessionLog).not.toHaveBeenCalled();
  expect(s.deps.initializeWorkoutData).not.toHaveBeenCalled();
  finish();
  await pending;
  expect(s.deps.migrateHistoryToSessionLog).toHaveBeenCalledOnce();
  expect(s.deps.initializeWorkoutData).toHaveBeenCalledWith('TER');
  expect(s.deps.document.body.inert).toBe(false);
  expect(s.deps.showOnboarding).toHaveBeenCalledOnce();
  expect(s.deps.maybeSuggestBackup).not.toHaveBeenCalled();
});

test.each([true, 'failure'])('restauração %s impede inicialização sobre dados incompletos', async outcome => {
  const s = setup({ isRestoringBackup: () => true,
    TREINO_BACKUP_RESTORE: { recover: async () => {
      if (outcome === 'failure') throw new Error('Sem espaço');
      return true;
    } } });
  await s.api.initialize();
  expect(s.deps.document.body.inert).toBe(true);
  expect(s.deps.initializeHistory).not.toHaveBeenCalled();
  expect(s.deps.window.location.reload).toHaveBeenCalledTimes(outcome === true ? 1 : 0);
  expect(s.deps.showToast).toHaveBeenCalledTimes(outcome === 'failure' ? 1 : 0);
});

test('virada de dia respeita restauração e atualiza o treino apenas uma vez', () => {
  let date = '2026-09-29', restoring = false;
  const s = setup({ todayKey: () => date, isRestoringBackup: () => restoring });
  s.api.checkDateRollover();
  expect(s.deps.clearDraft).not.toHaveBeenCalled();
  date = '2026-09-30'; restoring = true;
  s.api.checkDateRollover();
  expect(s.deps.clearDraft).not.toHaveBeenCalled();
  restoring = false;
  s.api.checkDateRollover();
  s.api.checkDateRollover();
  expect(s.deps.clearDraft).toHaveBeenCalledOnce();
  expect(s.deps.renderWaterCard).toHaveBeenCalledOnce();
  expect(s.deps.renderExercises).toHaveBeenCalledOnce();
});

test('atualização PWA ativa worker pendente e recarrega uma vez; APK não registra worker', async () => {
  const events = {};
  const registration = { update: vi.fn(async () => {}), waiting: { postMessage: vi.fn() }, addEventListener: vi.fn() };
  const serviceWorker = { register: vi.fn(async () => registration),
    addEventListener: (name, fn) => { events[name] = fn; } };
  const native = setup({ navigator: { serviceWorker } });
  expect(native.listeners.load).toBeUndefined();
  const web = setup({ navigator: { serviceWorker }, PLATFORM: { isNative: false } });
  web.listeners.load();
  await Promise.resolve();
  expect(serviceWorker.register).toHaveBeenCalledWith('sw.js');
  expect(registration.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  events.controllerchange(); events.controllerchange();
  expect(web.deps.window.location.reload).toHaveBeenCalledOnce();
});
