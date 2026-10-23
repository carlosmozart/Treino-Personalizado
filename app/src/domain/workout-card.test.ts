import { expect, test } from 'vitest';
import { workoutCard } from './workout-card';
import { workout } from './testing';
import type { Workout } from './model';

test('S9: cartão com título, data por extenso, números e recordes do dia', () => {
  const before = workout('2026-10-15', 'Supino Reto', [[10, 40], [10, 40], [10, 40]]);
  const today: Workout = {
    ...workout('2026-10-22', 'Supino Reto', [[10, 42.5], [10, 42.5], [9, 42.5]], 'w2'),
    dayName: 'Peito e tríceps', durationMin: 48
  };
  today.entries.push({ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 10 } });
  expect(workoutCard([before, today], today)).toEqual({
    title: 'Peito e tríceps',
    date: 'quinta-feira, 22/10/2026',
    stats: [
      { label: 'Minutos', value: '48' },
      { label: 'Exercícios', value: '2' },
      { label: 'Séries', value: '3' },
      { label: 'kg de volume', value: '1.233' }
    ],
    lines: [
      { name: 'Supino Reto', detail: '10/10/9 · 42,5kg', record: 'Recorde' },
      { name: 'Esteira', detail: '10min', record: null }
    ]
  });
});

test('S9: treino sem nome, sem duração e só de cardio mostra só o que tem', () => {
  const w: Workout = { id: 'c', date: '2026-10-22', source: 'app', entries: [{ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 20, km: 3 } }] };
  expect(workoutCard([w], w)).toMatchObject({ title: 'Treino', stats: [{ label: 'Exercício', value: '1' }], lines: [{ detail: '20min · 3km', record: null }] });
});
