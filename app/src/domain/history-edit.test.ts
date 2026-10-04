import { expect, test } from 'vitest';
import { removeWorkoutEntry, updateWorkoutEntry } from './actions';
import { exerciseProgress, exercisesInHistory } from './workouts';
import { sampleData, workout } from './testing';

const NOW = new Date('2026-10-07T12:00:00Z');

function data() {
  const a = workout('2026-10-01', 'Supino', [[10, 40], [8, 45]], 'w1');
  a.entries.push({ ...workout('x', 'Remada', [[10, 30]]).entries[0]!, aggregated: true });
  return sampleData({ workouts: [a, workout('2026-10-05', 'Supino', [[10, 50]], 'w2')] });
}

test('corrigir um exercício: séries vazias saem, registro antigo deixa de ser reconstruído', () => {
  const d = data();
  const entry = { ...d.workouts[0]!.entries[1]!, sets: [{ reps: 12, weight: 32, kind: 'work' as const }, { reps: 0, weight: 0, kind: 'work' as const }] };
  const { data: next } = updateWorkoutEntry(d, 'w1', 1, entry, NOW);
  expect(next.workouts[0]!.entries[1]).toMatchObject({ sets: [{ reps: 12, weight: 32 }] });
  expect(next.workouts[0]!.entries[1]!.aggregated).toBeUndefined();
  expect(next.sync.changed['workout:w1']).toBe(NOW.toISOString());
  expect(d.workouts[0]!.entries[1]!.aggregated).toBe(true);
});

test('apagar um exercício; o último apaga o treino', () => {
  const d = data();
  const one = removeWorkoutEntry(d, 'w1', 0, NOW).data;
  expect(one.workouts[0]!.entries.map(e => e.name)).toEqual(['Remada']);
  const none = removeWorkoutEntry(d, 'w2', 0, NOW).data;
  expect(none.workouts.map(w => w.id)).toEqual(['w1']);
  expect(none.sync.deleted['workout:w2']).toBe(NOW.toISOString());
});

test('exercícios do histórico e evolução pela melhor carga', () => {
  const d = data();
  expect(exercisesInHistory(d.workouts).map(e => [e.name, e.sessions])).toEqual([['Supino', 2], ['Remada', 1]]);
  expect(exerciseProgress(d.workouts, 'supino').map(p => [p.date, p.value, p.volume])).toEqual([['2026-10-01', 45, 760], ['2026-10-05', 50, 500]]);
});
