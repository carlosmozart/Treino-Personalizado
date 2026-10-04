import { expect, test } from 'vitest';
import type { AppData, Workout } from '../domain/model';
import { stampAll } from '../domain/sync';
import { sampleData } from '../domain/testing';
import { byteSize, changedParts, joinFromCloud, PartTooLargeError, splitForCloud } from './chunks';

function manyWorkouts(dates: string[], setsPerEntry = 4): AppData {
  const workouts: Workout[] = dates.map((date, i) => ({
    id: `w${i}`, date, startedAt: `${date}T10:00:00.000Z`, source: 'app',
    entries: Array.from({ length: 6 }, (_, e) => ({
      key: `exercicio ${e}`, name: `Exercício ${e}`, mode: 'reps',
      sets: Array.from({ length: setsPerEntry }, () => ({ reps: 10, weight: 42.5, kind: 'work' as const }))
    }))
  }));
  return stampAll(sampleData({ workouts }), new Date(2026, 9, 4));
}

const days = (year: number, count: number) => Array.from({ length: count }, (_, i) => {
  const d = new Date(year, 0, 1 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

test('treinos vão em partes por ano, com os próprios carimbos, e voltam iguais', () => {
  const data = manyWorkouts([...days(2025, 40), ...days(2026, 30)]);
  const parts = splitForCloud(data);
  expect(parts.main.chunkKeys).toEqual(['2025', '2026']);
  expect(parts.chunks['2025']!.workouts).toHaveLength(40);
  expect(Object.keys(parts.chunks['2026']!.changed)).toHaveLength(30);
  expect(Object.keys(parts.main.sync.changed).some(k => k.startsWith('workout:'))).toBe(false);
  expect('workouts' in parts.main).toBe(false);
  expect(joinFromCloud(parts)).toEqual(data);
});

test('ano que não cabe numa parte é dividido por mês', () => {
  const data = manyWorkouts(days(2026, 90));
  const yearSize = byteSize(splitForCloud(data).chunks['2026']);
  const parts = splitForCloud(data, Math.floor(yearSize / 2));
  expect(parts.main.chunkKeys).toEqual(['2026-01', '2026-02', '2026-03']);
  expect(joinFromCloud(parts)).toEqual(data);
});

test('treino diário por 5 anos cabe com folga (o caso realista)', () => {
  const data = manyWorkouts([2022, 2023, 2024, 2025, 2026].flatMap(y => days(y, 365)));
  const parts = splitForCloud(data);
  for (const chunk of Object.values(parts.chunks)) expect(byteSize(chunk)).toBeLessThan(900 * 1024);
  expect(byteSize(parts.main)).toBeLessThan(900 * 1024);
});

test('mês acima do limite avisa em vez de gravar algo que a nuvem recusaria', () => {
  expect(() => splitForCloud(manyWorkouts(days(2026, 20)), 1000)).toThrow(PartTooLargeError);
});

test('só as partes alteradas são regravadas; partes esvaziadas são removidas', () => {
  const data = manyWorkouts([...days(2025, 3), ...days(2026, 3)]);
  const before = splitForCloud(data);
  expect(changedParts(null, before)).toEqual({ write: ['2025', '2026'], remove: [] });
  const edited = { ...data, workouts: data.workouts.map(w => (w.id === 'w4' ? { ...w, dayName: 'Editado' } : w)) };
  expect(changedParts(before, splitForCloud(edited))).toEqual({ write: ['2026'], remove: [] });
  const without2025 = { ...data, workouts: data.workouts.filter(w => w.date.startsWith('2026')) };
  expect(changedParts(before, splitForCloud(without2025))).toEqual({ write: [], remove: ['2025'] });
});

test('parte faltando na nuvem é erro claro, não histórico incompleto', () => {
  const parts = splitForCloud(manyWorkouts(days(2026, 2)));
  delete parts.chunks['2026'];
  expect(() => joinFromCloud(parts)).toThrow('Parte "2026"');
});
