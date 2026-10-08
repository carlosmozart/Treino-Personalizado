import { describe, expect, it } from 'vitest';
import {
  disableRotation, enableRotation, maxRestGap, moveInRotation, restartRotation, rotationLetter, rotationOrder, rotationState, setRotationPerWeek
} from './rotation';
import { planExercise, sampleData, samplePlan } from './testing';
import { daysPerWeekOf, streakOf } from './rewards';
import { todayCard, weekStrip } from './home';
import { remindersFor } from './reminders';
import type { DayKey } from './ai-plan';
import type { Plan, Workout } from './model';

/** Plano com treinos só em SEG, QUA e SEX (A, B, C). */
function abc(): Plan {
  const p = samplePlan(k => (['SEG', 'QUA', 'SEX'].includes(k) ? [planExercise(`e-${k}`, `Ex ${k}`)] : []));
  return enableRotation(p);
}
const done = (date: string, dayKey: DayKey, hour = 10): Workout => ({
  id: `w-${date}-${dayKey}`, date, startedAt: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`, planId: 'p1', dayKey, source: 'app',
  entries: [{ key: 'x', name: 'X', mode: 'reps', sets: [{ reps: 10, weight: 10, kind: 'work' }] }]
});

describe('rotação', () => {
  it('liga com os treinos na ordem da semana e meta igual ao número de treinos', () => {
    const p = abc();
    expect(p.rotation).toEqual({ order: ['SEG', 'QUA', 'SEX'], perWeek: 3 });
    expect(['SEG', 'QUA', 'SEX'].map(k => rotationLetter(p, k as DayKey))).toEqual(['A', 'B', 'C']);
  });

  it('sem histórico, começa pelo A', () => {
    expect(rotationState(abc(), [])).toMatchObject({ next: 'SEG', done: 0, last: null });
  });

  it('o próximo é o seguinte ao último feito, em qualquer dia, dando a volta', () => {
    const p = abc();
    expect(rotationState(p, [done('2026-10-05', 'SEG')])).toMatchObject({ next: 'QUA', done: 1 });
    // fez o B num sábado: o próximo é o C
    expect(rotationState(p, [done('2026-10-05', 'SEG'), done('2026-10-10', 'QUA')])).toMatchObject({ next: 'SEX', done: 2 });
    expect(rotationState(p, [done('2026-10-05', 'SEG'), done('2026-10-06', 'QUA'), done('2026-10-07', 'SEX')])).toMatchObject({ next: 'SEG', done: 0 });
  });

  it('o mais recente vale, mesmo fora de ordem no histórico', () => {
    expect(rotationState(abc(), [done('2026-10-07', 'QUA'), done('2026-10-05', 'SEX')])).toMatchObject({ next: 'SEX' });
  });

  it('ignora treinos de outro plano e de espaços vazios', () => {
    const other = { ...done('2026-10-06', 'QUA'), planId: 'outro' };
    expect(rotationState(abc(), [done('2026-10-05', 'SEG'), other, done('2026-10-07', 'TER')])).toMatchObject({ next: 'QUA' });
  });

  it('reordenar muda as letras e o próximo', () => {
    const p = moveInRotation(abc(), 'SEX', -1);
    expect(rotationOrder(p)).toEqual(['SEG', 'SEX', 'QUA']);
    expect(rotationLetter(p, 'SEX')).toBe('B');
    expect(rotationState(p, [done('2026-10-05', 'SEG')])).toMatchObject({ next: 'SEX' });
    expect(moveInRotation(p, 'SEG', -1)).toBe(p);
  });

  it('treino que ganhou exercícios entra no fim; o que esvaziou sai', () => {
    const p = abc();
    p.days.DOM = { ...p.days.DOM, exercises: [planExercise('d', 'Ex DOM')] };
    p.days.QUA = { ...p.days.QUA, exercises: [] };
    expect(rotationOrder(p)).toEqual(['SEG', 'SEX', 'DOM']);
  });

  it('recomeçar do A ignora o que veio antes', () => {
    const p = restartRotation(abc(), new Date('2026-10-06T12:00:00.000Z'));
    expect(rotationState(p, [done('2026-10-05', 'SEG')])).toMatchObject({ next: 'SEG', done: 0 });
    expect(rotationState(p, [done('2026-10-05', 'SEG'), done('2026-10-07', 'SEG')])).toMatchObject({ next: 'QUA' });
  });

  it('voltar para a semana fixa mantém os dias', () => {
    const p = disableRotation(abc());
    expect(p.rotation).toBeUndefined();
    expect(p.days.QUA.exercises).toHaveLength(1);
  });

  it('meta por semana entre 1 e 7', () => {
    expect(setRotationPerWeek(abc(), 9).rotation?.perWeek).toBe(7);
    expect(setRotationPerWeek(abc(), 0).rotation?.perWeek).toBe(1);
  });

  it('folga que não quebra a sequência', () => {
    expect([2, 3, 4, 5, 6, 7].map(maxRestGap)).toEqual([3, 2, 1, 1, 1, 1]);
  });
});

describe('rotação no resto do app', () => {
  const withRotation = (workouts: Workout[], checkins: string[] = []) => {
    const d = sampleData();
    d.plans.p1 = abc();
    d.workouts = workouts;
    for (const c of checkins) d.checkins[c] = { dayKey: null };
    return d;
  };

  it('Início mostra o próximo da rotação em qualquer dia, nunca descanso', () => {
    const sunday = new Date(2026, 9, 11, 10);
    const card = todayCard(withRotation([done('2026-10-05', 'SEG')]), sunday, null);
    expect(card).toMatchObject({ kind: 'workout', dayKey: 'QUA', rotation: { letter: 'B', done: 1, total: 3 } });
  });

  it('semana sem dias planejados destacados', () => {
    expect(weekStrip(withRotation([]), new Date(2026, 9, 7)).some(d => d.planned)).toBe(false);
  });

  it('meta da semana vem da rotação', () => {
    const d = withRotation([]);
    d.plans.p1 = setRotationPerWeek(d.plans.p1!, 4);
    expect(daysPerWeekOf(d)).toBe(4);
  });

  it('sequência: 3×/semana aceita até 2 dias de folga seguidos', () => {
    const now = new Date(2026, 9, 10, 20); // sábado
    expect(streakOf(withRotation([], ['2026-10-03', '2026-10-06', '2026-10-09']), now)).toBe(3);
    // 3 dias sem treino entre 03 e 07 quebram
    expect(streakOf(withRotation([], ['2026-10-03', '2026-10-07', '2026-10-09']), now)).toBe(2);
  });

  it('sem lembretes por dia da semana na rotação', () => {
    const p = { ...abc(), trainingTime: '18:00' };
    expect(remindersFor(p)).toEqual([]);
    expect(remindersFor(disableRotation(p))).toHaveLength(3);
  });
});
