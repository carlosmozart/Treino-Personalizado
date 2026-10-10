import { describe, expect, it } from 'vitest';
import { addExerciseToSession, removeExerciseFromSession, sessionToWorkout, startPastSession, startSession, toggleSet } from './session';
import { finishWorkout } from './actions';
import { sampleData, workout } from './testing';

const NOW = new Date(2026, 9, 10, 20);

describe('adicionar e remover exercício no treino (M18)', () => {
  it('adiciona no fim com a carga da última vez; cardio vira cardio', () => {
    const d = sampleData({ workouts: [workout('2026-10-01', 'Rosca Direta (Barra)', [[10, 25], [10, 25]])] });
    let s = startSession(d, 'p1', 'SEX', NOW, 's1')!;
    s = addExerciseToSession(s, d, 'Rosca Direta (Barra)');
    const ex = s.exercises.at(-1)!;
    expect(ex).toMatchObject({ name: 'Rosca Direta (Barra)', mode: 'reps' });
    expect(ex.sets.map(x => x.weight)).toEqual([25, 25]);
    expect(addExerciseToSession(s, d, 'Esteira').exercises.at(-1)).toMatchObject({ mode: 'cardio', cardio: { minutes: 20 } });
    expect(addExerciseToSession(s, d, '   ')).toBe(s);
  });

  it('remove, mas sempre fica um', () => {
    const s = startSession(sampleData(), 'p1', 'SEX', NOW, 's1')!;
    const one = removeExerciseFromSession(s, 0);
    expect(one.exercises).toHaveLength(s.exercises.length - 1);
    expect(removeExerciseFromSession(removeExerciseFromSession(one, 0), 0).exercises).toHaveLength(1);
  });
});

describe('treino de um dia passado (M15)', () => {
  it('entra com a data, o início e a duração informados', () => {
    let s = startPastSession(sampleData(), 'p1', 'SEG', '2026-10-05', '07:30', 50, 's1')!;
    s = toggleSet(s, 0, 0);
    const w = sessionToWorkout(s, NOW)!;
    expect(w.date).toBe('2026-10-05');
    expect(new Date(w.startedAt!).getHours()).toBe(7);
    expect(w.durationMin).toBe(50);
    expect(Date.parse(w.endedAt!) - Date.parse(w.startedAt!)).toBe(50 * 60000);
  });

  it('não gera recorde retroativo, mas faz o check-in do dia', () => {
    const d = sampleData({ workouts: [workout('2026-10-01', 'Supino Reto', [[10, 40]])] });
    let s = startPastSession(d, 'p1', 'SEG', '2026-10-05', '18:00', 60, 's1')!;
    s = { ...s, exercises: s.exercises.map((e, i) => (i === 0 ? { ...e, sets: e.sets.map(x => ({ ...x, weight: 80, done: true })) } : e)) };
    const r = finishWorkout(d, s, NOW);
    expect(r.kind).toBe('saved');
    if (r.kind !== 'saved') return;
    expect(r.events.some(e => e.kind === 'record')).toBe(false);
    expect(r.data.checkins['2026-10-05']).toBeTruthy();
  });
});
