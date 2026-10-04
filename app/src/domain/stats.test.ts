import { expect, test } from 'vitest';
import { heatmap, historyByMonth, muscleBalance, statsSummary } from './stats';
import { sampleData, workout } from './testing';

const NOW = new Date(2026, 9, 7, 9); // quarta, 07/10/2026

test('resumo: total, mês, sequência e peso em 30 dias', () => {
  const data = sampleData({
    checkins: { '2026-09-30': { dayKey: 'QUA' }, '2026-10-05': { dayKey: 'SEG' }, '2026-10-06': { dayKey: 'TER' }, '2026-10-07': { dayKey: 'QUA' } },
    workouts: [workout('2026-10-06', 'Supino Reto (Barra)', [[10, 40]])]
  });
  data.profile.weighIns = [{ date: '2026-08-01', weight: 90 }, { date: '2026-09-10', weight: 88 }, { date: '2026-10-06', weight: 86.5 }];
  expect(statsSummary(data, NOW)).toEqual({ totalWorkouts: 1, thisMonth: 3, streak: 3, longestStreak: 3, weight30d: -1.5 });
});

test('mapa de calor: semanas de segunda a domingo, intensidade e futuro', () => {
  const data = sampleData({
    checkins: { '2026-10-05': { dayKey: 'SEG' }, '2026-10-06': { dayKey: 'TER' } },
    workouts: [workout('2026-10-06', 'Supino', [[10, 40], [10, 40]])]
  });
  const grid = heatmap(data, NOW, 4);
  expect(grid).toHaveLength(4);
  const week = grid[3]!;
  expect(week[0]).toEqual({ date: '2026-10-05', level: 1, future: false });
  expect(week[1]!.level).toBe(2);
  expect(week[3]!.future).toBe(true);
  expect(grid[0]![0]!.date).toBe('2026-09-14');
});

test('equilíbrio muscular pelos grupos da biblioteca, ignorando cardio e o que é antigo', () => {
  const data = sampleData({
    workouts: [
      workout('2026-10-01', 'Supino Reto (Barra)', [[10, 40], [10, 40], [8, 45]]),
      workout('2026-10-02', 'Remada Curvada (Barra)', [[10, 40]]),
      workout('2026-08-01', 'Remada Curvada (Barra)', [[10, 40], [10, 40], [10, 40], [10, 40]]),
      workout('2026-10-03', 'Inventado', [[10, 40]])
    ]
  });
  expect(muscleBalance(data, NOW)).toEqual([{ group: 'Peito', sets: 3 }, { group: 'Costas', sets: 1 }]);
});

test('histórico agrupado por mês, mais recente primeiro', () => {
  const groups = historyByMonth([workout('2026-09-20', 'A', [[1, 1]]), workout('2026-10-02', 'B', [[1, 1]]), workout('2026-10-05', 'C', [[1, 1]])]);
  expect(groups.map(g => [g.month, g.workouts.map(w => w.date)])).toEqual([
    ['2026-10', ['2026-10-05', '2026-10-02']], ['2026-09', ['2026-09-20']]
  ]);
});
