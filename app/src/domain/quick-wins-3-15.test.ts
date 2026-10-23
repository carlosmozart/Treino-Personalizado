import { expect, test } from 'vitest';
import { finishWorkout } from './actions';
import { addDays, weekStartOf } from './dates';
import { isDeloadDate, setDeloadWeek } from './deload';
import { progressCard, weekStrip } from './home';
import { suggestProgression } from './progression';
import { sessionToWorkout, startSession } from './session';
import { describeEntry, entryVolume } from './workouts';
import { planExercise, sampleData, samplePlan, workout } from './testing';
import type { AppData } from './model';

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour); // 19/10/2026 é segunda

test('M31: repetições por lado vão do plano ao treino e ao histórico, e o volume conta os dois lados', () => {
  const d = sampleData({ plans: { p1: samplePlan(() => [planExercise('e1', 'Afundo (Halteres)', { reps: 8, weight: 10, perSide: true })]) } });
  const started = startSession(d, 'p1', 'SEG', at(19), 's1')!;
  expect(started.exercises[0]!.perSide).toBe(true);
  const s = { ...started, exercises: started.exercises.map(e => ({ ...e, sets: e.sets.map(x => ({ ...x, done: true })) })) };
  const entry = sessionToWorkout(s, at(19, 10))!.entries[0]!;
  expect(entry.perSide).toBe(true);
  expect(describeEntry(entry)).toBe('3x8 por lado · 10kg');
  expect(entryVolume(entry)).toBe(3 * 8 * 10 * 2);
});

test('M31: a progressão anda por lado (1 rep por lado são 2 no total)', () => {
  const w = { ...workout('2026-10-12', 'Afundo', [[10, 0], [10, 0], [10, 0]]) };
  w.entries[0]!.perSide = true;
  expect(suggestProgression([w], 'afundo', { sets: 3, reps: 10, weight: 0 }, '2026-10-19')).toMatchObject({ kind: 'up', reps: 11 });
});

/** Supino 8–12 com 40 kg; última sessão normal com 3×12 (pede subir para 42,5). */
function withHistory(): AppData {
  const plan = samplePlan(() => [planExercise('e1', 'Supino Reto', { reps: 12, repMin: 8, repMax: 12, weight: 40 })]);
  return sampleData({ plans: { p1: plan }, workouts: [workout('2026-10-12', 'Supino Reto', [[12, 40], [12, 40], [12, 40]])] });
}

test('M32: marcar a semana como deload marca os treinos dela, e os seguintes também', () => {
  const d = withHistory();
  d.workouts.push(workout('2026-10-20', 'Supino Reto', [[10, 24], [10, 24]]));
  const on = setDeloadWeek(d, true, at(21)).data;
  expect(on.settings.deloadWeek).toBe('2026-10-19');
  expect(on.workouts.map(w => [w.date, !!w.deload])).toEqual([['2026-10-12', false], ['2026-10-20', true]]);
  expect(on.sync.changed['settings']).toBeDefined();
  expect(isDeloadDate(on, '2026-10-25')).toBe(true);
  expect(isDeloadDate(on, '2026-10-26')).toBe(false);

  const s = startSession(on, 'p1', 'QUA', at(22), 's1')!;
  const done = { ...s, exercises: s.exercises.map(e => ({ ...e, sets: e.sets.map(x => ({ ...x, done: true })) })) };
  const r = finishWorkout(on, done, at(22, 10));
  expect(r.kind === 'saved' && r.workout.deload).toBe(true);

  const off = setDeloadWeek(on, false, at(23)).data;
  expect(off.settings.deloadWeek).toBeUndefined();
  expect(off.workouts.some(w => w.deload)).toBe(false);
});

test('M32: o treino de deload não é base da progressão, e na semana de deload a carga não sobe', () => {
  const d = setDeloadWeek(withHistory(), true, at(19)).data;
  // na semana de deload: sem sugestão de subir; carga da última sessão normal
  const inDeload = startSession(d, 'p1', 'TER', at(20), 's1')!.exercises[0]!;
  expect(inDeload.progression).toBeUndefined();
  expect(inDeload.sets[0]).toMatchObject({ weight: 40 });

  // depois: o treino leve de 24 kg fica no histórico, mas a sugestão continua de 40 → 42,5
  const after = { ...d, workouts: [...d.workouts, { ...workout('2026-10-21', 'Supino Reto', [[10, 24], [10, 24], [10, 24]]), deload: true as const }] };
  expect(suggestProgression(after.workouts, 'supino reto', after.plans.p1!.days.SEG.exercises[0]!, '2026-10-27')).toMatchObject({ kind: 'up', weight: 42.5 });
  const next = startSession(after, 'p1', 'TER', at(27), 's2')!.exercises[0]!;
  expect(next.sets[0]).toMatchObject({ weight: 42.5 });
});

test('M19: a semana pode começar no domingo', () => {
  expect(weekStartOf('2026-10-25', 'seg')).toBe('2026-10-19'); // domingo fecha a semana de segunda
  expect(weekStartOf('2026-10-25', 'dom')).toBe('2026-10-25');
  expect(weekStartOf('2026-10-24', 'dom')).toBe('2026-10-18'); // sábado fecha a de domingo
  expect(weekStartOf('2026-10-19', 'dom')).toBe('2026-10-18');

  const d = sampleData();
  d.settings.weekStart = 'dom';
  d.checkins = { '2026-10-18': { dayKey: null }, '2026-10-24': { dayKey: null } };
  const strip = weekStrip(d, at(24));
  expect(strip.map(x => x.dayKey)).toEqual(['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']);
  expect(strip[0]!.date).toBe('2026-10-18');
  // de domingo: o domingo 18 e o sábado 24 são a mesma semana; de segunda, o domingo 18 é da anterior
  expect(progressCard(d, at(24)).weekDone).toBe(2);
  d.settings.weekStart = 'seg';
  expect(progressCard(d, at(24)).weekDone).toBe(1);
  expect(addDays(weekStartOf('2026-10-24', 'seg'), 6)).toBe('2026-10-25');
});
