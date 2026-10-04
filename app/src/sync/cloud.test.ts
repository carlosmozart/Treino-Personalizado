import { expect, test } from 'vitest';
import { finishWorkout, updateSettings } from '../domain/actions';
import type { AppData } from '../domain/model';
import { completeExercise, startSession } from '../domain/session';
import { stampAll } from '../domain/sync';
import { sampleData } from '../domain/testing';
import { memoryCloud, SyncConflictError, syncOnce, type CloudStore } from './cloud';

const at = (day: number, hour = 10) => new Date(2026, 9, day, hour);
const base = () => stampAll(sampleData(), at(1));
function train(data: AppData, day: number, id: string): AppData {
  const s = completeExercise(completeExercise(startSession(data, 'p1', 'SEG', at(day), id)!, 0), 1);
  const r = finishWorkout(data, s, at(day, 11));
  if (r.kind !== 'saved') throw new Error();
  return r.data;
}

test('primeiro envio com a nuvem vazia grava os dados locais', async () => {
  const cloud = memoryCloud();
  const local = train(base(), 5, 'a');
  const r = await syncOnce(cloud, local, null);
  expect(r).toMatchObject({ revision: 1, mergedRemote: false });
  expect(r.data).toBe(local);
  expect(cloud.doc()?.data.workouts.map(w => w.id)).toEqual(['a']);
});

test('celular novo: junta o que já está na nuvem com o que há no aparelho, sem sobrescrever', async () => {
  const cloud = memoryCloud();
  await syncOnce(cloud, train(base(), 5, 'antigo'), null);
  const r = await syncOnce(cloud, train(base(), 6, 'novo'), null);
  expect(r.mergedRemote).toBe(true);
  expect(r.revision).toBe(2);
  expect(r.data.workouts.map(w => w.id)).toEqual(['antigo', 'novo']);
  expect(cloud.doc()?.data.workouts.map(w => w.id)).toEqual(['antigo', 'novo']);
});

test('outro aparelho gravou no meio: junta e tenta de novo; os dois ficam iguais', async () => {
  const cloud = memoryCloud();
  const start = await syncOnce(cloud, base(), null);
  const phone = await syncOnce(cloud, train(start.data, 5, 'celular'), start.revision);
  const tablet = await syncOnce(cloud, updateSettings(train(start.data, 6, 'tablet'), { restSeconds: 60 }, at(6)).data, start.revision);
  expect(tablet.mergedRemote).toBe(true);
  expect(tablet.data.workouts.map(w => w.id)).toEqual(['celular', 'tablet']);
  const phoneAgain = await syncOnce(cloud, phone.data, phone.revision);
  expect(phoneAgain.data.workouts).toEqual(tablet.data.workouts);
  expect(phoneAgain.data.settings.restSeconds).toBe(60);
  expect(phoneAgain.data.gamification.totalXP).toBe(200);
});

test('nuvem esvaziada (conta apagada em outro aparelho): o aparelho grava de novo do zero', async () => {
  const cloud = memoryCloud();
  const first = await syncOnce(cloud, train(base(), 5, 'a'), null);
  cloud.clear();
  const r = await syncOnce(cloud, first.data, first.revision);
  expect(r.revision).toBe(1);
  expect(cloud.doc()?.data.workouts).toHaveLength(1);
});

test('desiste depois de várias disputas seguidas, sem perder os dados locais', async () => {
  const busy: CloudStore = {
    pull: async () => null,
    push: async () => ({ ok: false, current: { data: base(), revision: Math.random() } })
  };
  await expect(syncOnce(busy, base(), 1)).rejects.toBeInstanceOf(SyncConflictError);
});

test('falha de rede chega a quem chamou (para tentar mais tarde)', async () => {
  const offline: CloudStore = { pull: async () => { throw new Error('sem rede'); }, push: async () => { throw new Error('sem rede'); } };
  await expect(syncOnce(offline, base(), null)).rejects.toThrow('sem rede');
});
