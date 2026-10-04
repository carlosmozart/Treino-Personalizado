import { expect, test, vi } from 'vitest';
import { startRestAlarm, type Scheduled } from './rest-alarm';

function setup(result: Scheduled, enabled = true) {
  let listener: (e: number | null, p: number | null) => void = () => undefined;
  const schedule = vi.fn(() => Promise.resolve(result));
  const cancel = vi.fn(() => Promise.resolve());
  const alarm = startRestAlarm({ subscribe: l => { listener = l; }, schedule, cancel, enabled: () => enabled, onError: () => undefined });
  const flush = () => new Promise(r => setTimeout(r, 0));
  return { alarm, schedule, cancel, emit: (e: number | null, p: number | null) => listener(e, p), flush };
}

test('agenda no início, reagenda no ajuste e cancela ao pular', async () => {
  const s = setup('exact');
  const end = Date.now() + 90_000;
  s.emit(end, null); await s.flush();
  expect(s.schedule).toHaveBeenCalledWith(new Date(end));
  expect(s.alarm.handledNatively(end)).toBe(true);
  s.emit(end + 15_000, end); await s.flush();
  expect(s.alarm.handledNatively(end)).toBe(false);
  s.emit(null, end + 15_000); await s.flush();
  expect(s.cancel).toHaveBeenCalledTimes(1);
});

test('fim do descanso com alarme exato não cancela; sem exato, a página toca e cancela', async () => {
  const exact = setup('exact');
  const end = Date.now() + 100;
  exact.emit(end, null); await exact.flush();
  await new Promise(r => setTimeout(r, 120));
  exact.emit(null, end); await exact.flush();
  expect(exact.cancel).not.toHaveBeenCalled();

  const inexact = setup('inexact');
  inexact.emit(end, null); await inexact.flush();
  expect(inexact.alarm.handledNatively(end)).toBe(false);
  inexact.emit(null, end); await inexact.flush();
  expect(inexact.cancel).toHaveBeenCalledTimes(1);
});

test('desligado: não agenda', async () => {
  const s = setup('exact', false);
  s.emit(Date.now() + 1000, null); await s.flush();
  expect(s.schedule).not.toHaveBeenCalled();
});
