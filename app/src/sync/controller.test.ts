import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { addWater } from '../domain/actions';
import type { AppData } from '../domain/model';
import { stampAll } from '../domain/sync';
import { sampleData } from '../domain/testing';
import { memoryCloud, type CloudStore } from './cloud';
import { createSyncController, INITIAL_CLOUD_STATE, type CloudState, type SyncStatus } from './controller';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const at = (day: number, hour = 10) => new Date(2026, 9, day, hour);

function device(cloud: CloudStore | null, start: AppData = stampAll(sampleData(), at(1))) {
  let data = start;
  let online = true;
  let saved: CloudState = { ...INITIAL_CLOUD_STATE };
  const onlineListeners: (() => void)[] = [];
  const statuses: SyncStatus[] = [];
  const controller = createSyncController({
    cloud,
    getData: () => data,
    applyData: d => { data = d; },
    loadState: async () => saved,
    saveState: async s => { saved = s; },
    isOnline: () => online,
    onOnline: l => { onlineListeners.push(l); return () => {}; },
    onStatus: s => statuses.push(s),
    now: () => at(5),
    debounceMs: 1000
  });
  return {
    controller, statuses,
    get data() { return data; },
    get saved() { return saved; },
    change(fn: (d: AppData) => AppData) { data = fn(data); return controller.markDirty(); },
    setOnline(v: boolean) { online = v; if (v) onlineListeners.forEach(l => l()); }
  };
}

test('sem login não sincroniza nada', async () => {
  const d = device(null);
  await d.controller.start();
  await d.change(x => addWater(x, 500, at(5)).data);
  expect(d.statuses).toEqual(['off']);
});

test('mudanças viram uma única gravação depois da espera, e o estado fica salvo', async () => {
  const cloud = memoryCloud();
  const d = device(cloud);
  await d.controller.start();
  expect(cloud.writes).toBe(1);
  await d.change(x => addWater(x, 300, at(5)).data);
  await d.change(x => addWater(x, 200, at(5)).data);
  expect(d.saved.dirty).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(cloud.writes).toBe(2);
  expect(cloud.doc()?.data.water['2026-10-05']).toBe(500);
  expect(d.saved).toMatchObject({ dirty: false, revision: 2, lastSyncedAt: at(5).toISOString() });
  expect(d.statuses.at(-1)).toBe('idle');
});

test('sem internet: fica pendente e envia quando a conexão volta', async () => {
  const cloud = memoryCloud();
  const d = device(cloud);
  await d.controller.start();
  d.setOnline(false);
  await d.change(x => addWater(x, 300, at(5)).data);
  await vi.advanceTimersByTimeAsync(1000);
  expect(d.statuses.at(-1)).toBe('offline');
  expect(d.saved.dirty).toBe(true);
  d.setOnline(true);
  await vi.runOnlyPendingTimersAsync();
  expect(cloud.doc()?.data.water['2026-10-05']).toBe(300);
  expect(d.saved.dirty).toBe(false);
});

test('pendência sobrevive a fechar o app: na próxima abertura é enviada', async () => {
  const cloud = memoryCloud();
  const first = device(cloud);
  await first.controller.start();
  first.setOnline(false);
  await first.change(x => addWater(x, 300, at(5)).data);
  first.controller.stop();
  expect(first.saved.dirty).toBe(true);
  // reabre com o mesmo estado salvo e a internet de volta
  const reopened = createSyncController({
    cloud, getData: () => first.data, applyData: () => {}, loadState: async () => first.saved,
    saveState: async () => {}, isOnline: () => true, onOnline: () => () => {}
  });
  await reopened.start();
  expect(cloud.doc()?.data.water['2026-10-05']).toBe(300);
});

test('falha da nuvem: tenta de novo com intervalo crescente', async () => {
  let fail = 2;
  const real = memoryCloud();
  const flaky: CloudStore = {
    pull: () => real.pull(),
    push: (data, rev) => (fail-- > 0 ? Promise.reject(new Error('servidor indisponível')) : real.push(data, rev))
  };
  const d = device(flaky);
  await d.controller.start();
  expect(d.statuses.at(-1)).toBe('error');
  await vi.advanceTimersByTimeAsync(5_000);
  expect(real.writes).toBe(0);
  await vi.advanceTimersByTimeAsync(15_000);
  expect(real.writes).toBe(1);
  expect(d.statuses.at(-1)).toBe('idle');
});

test('dados de outro aparelho chegam junto com o envio', async () => {
  const cloud = memoryCloud();
  const other = device(cloud);
  await other.controller.start();
  await other.change(x => addWater(x, 800, at(4)).data);
  await vi.advanceTimersByTimeAsync(1000);

  const d = device(cloud);
  await d.controller.start();
  expect(d.data.water['2026-10-04']).toBe(800);
});
