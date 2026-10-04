import { expect, test, vi } from 'vitest';
import { createPersister } from './persister';

test('agrupa toques seguidos numa gravação e grava a última versão', async () => {
  vi.useFakeTimers();
  const writes: number[] = [];
  const p = createPersister<number>(async v => { writes.push(v); }, { delay: 100 });
  p.schedule(1); p.schedule(2); p.schedule(3);
  expect(p.pending).toBe(true);
  await vi.advanceTimersByTimeAsync(100);
  expect(writes).toEqual([3]);
  expect(p.pending).toBe(false);
  vi.useRealTimers();
});

test('nunca grava em paralelo; o que chega durante a gravação vai em seguida', async () => {
  let active = 0, maxActive = 0;
  const writes: number[] = [];
  let release!: () => void;
  const p = createPersister<number>(async v => {
    active++; maxActive = Math.max(maxActive, active);
    if (v === 1) await new Promise<void>(r => { release = r; });
    writes.push(v); active--;
  }, { delay: 10_000 });
  p.schedule(1);
  const first = p.flush();
  await Promise.resolve();
  p.schedule(2);
  const second = p.flush();
  release();
  await Promise.all([first, second]);
  expect(writes).toEqual([1, 2]);
  expect(maxActive).toBe(1);
});

test('erro na gravação é avisado e não trava as próximas', async () => {
  const errors: unknown[] = [];
  const writes: number[] = [];
  const p = createPersister<number>(async v => { if (v === 1) throw new Error('disco cheio'); writes.push(v); }, { onError: e => errors.push(e) });
  p.schedule(1); await p.flush();
  p.schedule(2); await p.flush();
  expect(errors).toHaveLength(1);
  expect(writes).toEqual([2]);
});
