import { describe, expect, it } from 'vitest';
import { finishWorkout, moveWorkoutDate } from './actions';
import { workoutToPlanDay } from './plan-edit';
import { addExerciseToSession, startFreeSession, toggleSet } from './session';
import { rotationState, enableRotation } from './rotation';
import { sampleData, workout } from './testing';
import type { Workout } from './model';

const NOW = new Date(2026, 9, 12, 20);

describe('treino livre', () => {
  it('começa vazio e salva o que foi adicionado, sem contar na rotação', () => {
    const d = sampleData();
    d.plans.p1 = enableRotation(d.plans.p1!);
    let s = startFreeSession(NOW, 'livre');
    expect(s.exercises).toEqual([]);
    s = toggleSet(addExerciseToSession(s, d, 'Rosca Direta (Barra)'), 0, 0);
    const r = finishWorkout(d, s, NOW);
    expect(r.kind).toBe('saved');
    if (r.kind !== 'saved') return;
    expect(r.workout).toMatchObject({ dayName: 'Treino livre', planId: '' });
    expect(rotationState(r.data.plans.p1!, r.data.workouts)?.done).toBe(0);
  });
});

describe('salvar treino como dia do plano', () => {
  it('séries, reps e carga da melhor série; cardio com os minutos', () => {
    const w: Workout = { ...workout('2026-10-10', 'Supino Reto', [[10, 60], [8, 62.5], [8, 62.5]]), dayName: 'Peito forte' };
    w.entries[0]!.sets.unshift({ reps: 10, weight: 20, kind: 'warmup' });
    w.entries.push({ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 15 } });
    let n = 0;
    const day = workoutToPlanDay(w, () => `x${++n}`);
    expect(day.name).toBe('Peito forte');
    expect(day.exercises[0]).toMatchObject({ name: 'Supino Reto', mode: 'reps', sets: 3, reps: 8, weight: 62.5 });
    expect(day.exercises[1]).toMatchObject({ name: 'Esteira', mode: 'cardio', minutes: 15 });
  });
});

describe('corrigir a data de um treino salvo', () => {
  const base = () => {
    const d = sampleData({ workouts: [{ ...workout('2026-10-10', 'Supino', [[10, 40]], 'w1'), startedAt: '2026-10-10T21:00:00.000Z' }] });
    d.checkins['2026-10-10'] = { dayKey: 'SEX' };
    d.gamification.checkinXP['2026-10-10'] = { full: true, xp: 100 } as never;
    return d;
  };

  it('leva o treino, o horário, a presença e o XP para o dia novo', () => {
    const r = moveWorkoutDate(base(), 'w1', '2026-10-09', NOW).data;
    expect(r.workouts[0]).toMatchObject({ date: '2026-10-09', startedAt: '2026-10-09T21:00:00.000Z' });
    expect(r.checkins['2026-10-09']).toBeTruthy();
    expect(r.checkins['2026-10-10']).toBeUndefined();
    expect(r.gamification.checkinXP['2026-10-09']).toBeTruthy();
    expect(r.gamification.checkinXP['2026-10-10']).toBeUndefined();
  });

  it('nunca para o futuro', () => {
    const d = base();
    expect(moveWorkoutDate(d, 'w1', '2026-10-13', NOW).data).toBe(d);
  });

  it('com outro treino no dia antigo, a presença dele fica', () => {
    const d = base();
    d.workouts.push(workout('2026-10-10', 'Remada', [[10, 30]], 'w2'));
    const r = moveWorkoutDate(d, 'w1', '2026-10-08', NOW).data;
    expect(r.checkins['2026-10-10']).toBeTruthy();
    expect(r.checkins['2026-10-08']).toBeTruthy();
  });
});
