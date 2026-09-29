import { test, expect, vi, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../../js/ui/rest-timer.js', import.meta.url), 'utf8');
afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  const context = vm.createContext({ window: {}, Date });
  vm.runInContext(source, context);
  let settings = { restSeconds: 90, restSound: false, restVibrate: true };
  const nodes = {}, listeners = {}, state = { running: false };
  const node = id => nodes[id] ||= { classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() }, style: {}, setAttribute: vi.fn() };
  const document = { hidden: false, getElementById: node, addEventListener: (event, fn) => { listeners[event] = fn; } };
  const vibration = vi.fn(), schedule = vi.fn(async () => {}), cancel = vi.fn(async () => {}), refresh = vi.fn();
  const api = context.window.TREINO_REST_TIMER.create({
    document, window: {}, navigator: { vibrate: vibration }, PLATFORM: { isNative: false },
    getSettings: () => settings, restTimer: state, saveSettings: vi.fn(), showToast: vi.fn(),
    cancelRestBackgroundNotification: cancel, scheduleRestBackgroundNotification: schedule,
    renderNotificationSettings: vi.fn(), setInterval, clearInterval, setTimeout, refreshHistoryOnResume: refresh
  });
  return { api, state, node, document, listeners, vibration, schedule, cancel, refresh,
    set settings(value) { settings = value; } };
}
test('retomada usa horário final, conclui uma vez e respeita vibração', () => {
  const s = setup();
  s.api.startRestTimer(30, 'Supino');
  s.document.hidden = true;
  s.listeners.visibilitychange();
  expect(s.schedule).toHaveBeenCalledOnce();
  vi.setSystemTime(new Date('2026-09-29T12:01:00Z'));
  s.document.hidden = false;
  s.listeners.visibilitychange();
  expect(s.state.running).toBe(false);
  expect(s.node('restTimerDisplay').textContent).toBe('0:00');
  expect(s.vibration).toHaveBeenCalledOnce();
  s.api.tickRestTimer();
  expect(s.vibration).toHaveBeenCalledOnce();
  expect(s.refresh).toHaveBeenCalledOnce();
});
test('ajuste negativo mantém um segundo; cancelar impede alerta posterior', () => {
  const s = setup();
  s.api.startRestTimer(30);
  s.api.adjustRestTimer(-100);
  expect(s.api.remainingRestSeconds()).toBe(1);
  s.api.stopRestTimer();
  vi.advanceTimersByTime(60000);
  expect(s.vibration).not.toHaveBeenCalled();
  expect(s.node('restTimerWidget').classList.add).toHaveBeenCalledWith('hidden');
});
test('reiniciar substitui contagem anterior e lê preferências atualizadas', () => {
  const s = setup();
  s.api.startRestTimer(5);
  s.settings = { restSeconds: 20, restSound: false, restVibrate: false };
  s.api.startRestTimer();
  vi.advanceTimersByTime(5000);
  expect(s.state.running).toBe(true);
  expect(s.api.remainingRestSeconds()).toBe(15);
  vi.advanceTimersByTime(15000);
  expect(s.state.running).toBe(false);
  expect(s.vibration).not.toHaveBeenCalled();
});
