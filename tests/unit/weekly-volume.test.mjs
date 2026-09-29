import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
for (const path of ['core/date-utils', 'ui/weekly-volume']) {
  vm.runInContext(await readFile(new URL('../../js/' + path + '.js', import.meta.url), 'utf8'), context);
}
test('volume semanal inclui semanas vazias e separa domingo de segunda na virada do ano', () => {
  let history = [
    { date: '2025-12-28', volume: 150 },
    { date: '2026-01-04', volume: 200 },
    { date: '2026-01-05', volume: 300 },
    { date: '2026-01-06', volume: 0 }
  ];
  const dates = context.window.TREINO_DATE;
  const api = context.window.TREINO_WEEKLY_VOLUME.create({
    buildWorkoutHistory: () => history,
    formatLocalDateKey: d => dates.formatLocalDateKey(d),
    getMondayOf: date => dates.getMondayOf(date),
    getMondayOfCurrentWeek: () => new Date(2026, 0, 5)
  });
  const weeks = api.buildWeeklyVolume(4);
  expect(weeks.map(w => [w.inicio, w.volume, w.treinos])).toEqual([
    ['2025-12-15', 0, 0], ['2025-12-22', 150, 1],
    ['2025-12-29', 200, 1], ['2026-01-05', 300, 2]
  ]);
  history = [];
  expect(api.buildWeeklyVolume(1)[0]).toMatchObject({ volume: 0, treinos: 0 });
});
