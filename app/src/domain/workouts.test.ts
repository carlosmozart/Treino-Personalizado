import { expect, test } from 'vitest';
import type { Workout, WorkoutEntry } from './model';
import {
  bestSet, describeEntry, entryVolume, isPersonalRecord, lastSessionBefore, workoutCalories, workoutVolume
} from './workouts';

const s = (reps: number, weight: number, kind: 'work' | 'warmup' = 'work') => ({ reps, weight, kind });
const entry = (sets: ReturnType<typeof s>[], extra: Partial<WorkoutEntry> = {}): WorkoutEntry =>
  ({ key: 'supino', name: 'Supino', mode: 'reps', sets, ...extra });
const workout = (id: string, date: string, entries: WorkoutEntry[], extra: Partial<Workout> = {}): Workout =>
  ({ id, date, source: 'app', entries, ...extra });

test('volume e melhor série ignoram aquecimento', () => {
  const e = entry([s(10, 20, 'warmup'), s(10, 40), s(8, 45)]);
  expect(entryVolume(e)).toBe(760);
  expect(bestSet(e)).toEqual(s(8, 45));
  expect(bestSet(entry([s(8, 40), s(10, 40)]))).toEqual(s(10, 40));
  expect(bestSet(entry([s(10, 20, 'warmup')]))).toBeNull();
  expect(workoutVolume(workout('w', '2026-10-01', [e, e]))).toBe(1520);
});

test('descrição curta por série, faixa de carga, cardio e registro antigo', () => {
  expect(describeEntry(entry([s(10, 40), s(10, 40), s(10, 40)]))).toBe('3x10 · 40kg');
  expect(describeEntry(entry([s(12, 40), s(10, 45), s(8, 50)]))).toBe('12/10/8 · 50-40kg');
  expect(describeEntry(entry([s(10, 40)], { aggregated: true }))).toBe('1x10 · 40kg (registro antigo)');
  expect(describeEntry({ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 25, km: 3 } })).toBe('25min · 3km');
  expect(describeEntry(entry([]))).toBe('--');
});

test('última sessão antes da data, pela identidade do exercício', () => {
  const ws = [
    workout('a', '2026-09-01', [entry([s(10, 40)])]),
    workout('b', '2026-09-08', [entry([s(10, 42.5)])]),
    workout('c', '2026-09-15', [entry([s(10, 45)])])
  ];
  expect(lastSessionBefore(ws, 'supino', '2026-09-15')?.workout.id).toBe('b');
  expect(lastSessionBefore(ws, 'supino', '2026-09-01')).toBeNull();
  expect(lastSessionBefore(ws, 'agachamento', '2026-12-01')).toBeNull();
});

test('recorde compara só com sessões anteriores e não conta a primeira', () => {
  const first = workout('a', '2026-09-01', [entry([s(10, 40)])]);
  const better = workout('b', '2026-09-08', [entry([s(10, 45)])]);
  const backfilled = workout('c', '2026-09-05', [entry([s(10, 50)])]);
  const all = [first, better, backfilled];
  expect(isPersonalRecord(all, first, first.entries[0]!)).toBe(false);
  // treino lançado depois com data antiga: é recorde frente ao que veio antes dele…
  expect(isPersonalRecord(all, backfilled, backfilled.entries[0]!)).toBe(true);
  // …e o treino de 08/09 deixa de ser recorde, porque 05/09 já tinha 50 kg
  expect(isPersonalRecord(all, better, better.entries[0]!)).toBe(false);
});

test('calorias usam a duração medida, ou a estimada quando o cronômetro falhou', () => {
  const sets = Array.from({ length: 12 }, () => s(10, 40));
  const medido = workoutCalories(workout('w', '2026-10-01', [entry(sets)], { durationMin: 45 }), 80, 90)!;
  expect(medido.measured).toBe(true);
  expect(medido.strengthMinutes).toBe(45);
  const falhou = workoutCalories(workout('w', '2026-10-01', [entry(sets)], { durationMin: 1 }), 80, 90)!;
  expect(falhou.measured).toBe(false);
  expect(falhou.strengthMinutes).toBe(27); // 12 × (45 + 90) s
  expect(falhou.kcal).toBeGreaterThan(medido.kcal * 0.5);
  expect(workoutCalories(workout('w', '2026-10-01', [entry(sets)]), 0, 90)).toBeNull();
});

test('descrição usa vírgula decimal', () => {
  const entry = { key: 'x', name: 'X', mode: 'reps' as const, sets: [{ reps: 12, weight: 42.5, kind: 'work' as const }, { reps: 12, weight: 15, kind: 'work' as const }] };
  expect(describeEntry(entry)).toBe('2x12 · 42,5-15kg');
});
