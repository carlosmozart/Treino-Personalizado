// T13 e T14 (ideias do openGym 1.4.3): "Novo neste treino" e rotação com descanso e treino repetido.
import { describe, expect, it } from 'vitest';
import type { DayKey } from './ai-plan';
import { nextWorkoutAfterToday, todayCard } from './home';
import type { Plan, Workout } from './model';
import { addedEntries, addEntriesToPlan, workoutToPlanDay } from './plan-edit';
import { exportPlan, readPlanFile } from './plan-share';
import { remindersFor } from './reminders';
import { streakOf } from './rewards';
import {
  addSlot, canRemoveSlot, enableRotation, longestRestRun, MAX_ROTATION_SLOTS, maxRestGap, moveSlot, removeSlot, REST_SLOT,
  rotationLetter, rotationOrder, rotationSlots, rotationState, type RotationSlot
} from './rotation';
import { addExerciseToSession, sessionToWorkout, startFreeSession, startSession, swapExercise, toggleSet, updateSet } from './session';
import { planExercise, sampleData, samplePlan } from './testing';

/** Treinos em SEG, QUA e SEX (A, B, C), com a volta pedida. */
function plan(order: RotationSlot[], perWeek = 4): Plan {
  const p = enableRotation(samplePlan(k => (['SEG', 'QUA', 'SEX'].includes(k) ? [planExercise(`e-${k}`, `Ex ${k}`)] : [])));
  return { ...p, rotation: { order, perWeek } };
}
const done = (date: string, dayKey: DayKey, hour = 10): Workout => ({
  id: `w-${date}-${dayKey}-${hour}`, date, startedAt: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`, planId: 'p1', dayKey, source: 'app',
  entries: [{ key: 'x', name: 'X', mode: 'reps', sets: [{ reps: 10, weight: 10, kind: 'work' }] }]
});
// A, B, descanso, C, B
const ABRCB: RotationSlot[] = ['SEG', 'QUA', REST_SLOT, 'SEX', 'QUA'];

describe('T14: volta com descanso e treino repetido', () => {
  it('a volta guarda repetições e descansos; letras e total contam só treinos distintos', () => {
    const p = plan(ABRCB);
    expect(rotationSlots(p)).toEqual(ABRCB);
    expect(rotationOrder(p)).toEqual(['SEG', 'QUA', 'SEX']);
    expect(rotationLetter(p, 'SEX')).toBe('C');
    expect(rotationState(p, [])).toMatchObject({ next: 'SEG', nextIndex: 0, done: 0, total: 4, restDays: 0 });
  });

  it('treino repetido: cada treino ocupa o primeiro lugar igual depois do anterior', () => {
    const p = plan(ABRCB);
    const hist = [done('2026-10-05', 'SEG'), done('2026-10-06', 'QUA'), done('2026-10-08', 'SEX')];
    expect(rotationState(p, hist)).toMatchObject({ next: 'QUA', nextIndex: 4, done: 3 });
    // o B de novo fecha a volta
    expect(rotationState(p, [...hist, done('2026-10-09', 'QUA')])).toMatchObject({ next: 'SEG', nextIndex: 0, done: 0 });
  });

  it('descanso depois do treino vale pelos dias seguintes; treinar nele passa para o próximo', () => {
    const p = plan(ABRCB);
    const hist = [done('2026-10-05', 'SEG'), done('2026-10-06', 'QUA')];
    const st = rotationState(p, hist, '2026-10-07');
    expect(st).toMatchObject({ next: 'SEX', restDays: 1, restUntil: '2026-10-07', restToday: true });
    expect(rotationState(p, hist, '2026-10-06')!.restToday).toBe(false);
    expect(rotationState(p, hist, '2026-10-08')!.restToday).toBe(false);
    // treinou no dia de descanso: o C entra e o próximo é o B repetido
    expect(rotationState(p, [...hist, done('2026-10-07', 'SEX')], '2026-10-07')).toMatchObject({ next: 'QUA', nextIndex: 4, restToday: false });
  });

  it('descanso no começo da volta não segura o primeiro treino; depois da volta, vale', () => {
    const p = plan([REST_SLOT, 'SEG', 'QUA', 'SEX']);
    expect(rotationState(p, [], '2026-10-05')).toMatchObject({ next: 'SEG', restDays: 0, restToday: false });
    const st = rotationState(p, [done('2026-10-05', 'SEG'), done('2026-10-06', 'QUA'), done('2026-10-07', 'SEX')], '2026-10-08');
    expect(st).toMatchObject({ next: 'SEG', restDays: 1, restToday: true });
  });

  it('Início: no descanso da volta, cartão de descanso com o próximo e quando', () => {
    const d = sampleData();
    d.plans.p1 = plan([...ABRCB.slice(0, 2), REST_SLOT, ...ABRCB.slice(2)]);
    d.workouts = [done('2026-10-05', 'SEG'), done('2026-10-06', 'QUA')];
    expect(todayCard(d, new Date(2026, 9, 7, 9), null)).toMatchObject({ kind: 'rest', rotation: { letter: 'C' }, next: { dayKey: 'SEX', inDays: 2 } });
    expect(todayCard(d, new Date(2026, 9, 8, 9), null)).toMatchObject({ kind: 'rest', next: { inDays: 1 } });
    expect(todayCard(d, new Date(2026, 9, 9, 9), null)).toMatchObject({ kind: 'workout', dayKey: 'SEX' });
    // treinou hoje: o próximo vem depois do descanso
    expect(nextWorkoutAfterToday(d, new Date(2026, 9, 6, 20))!.when).toBe('treino C da rotação, depois de 2 dias de descanso');
  });

  it('lembretes pulam os dias de descanso da volta', () => {
    const p = { ...plan(ABRCB, 7), trainingTime: '18:00' };
    const list = remindersFor(p, { now: new Date(2026, 9, 6, 20), workouts: [done('2026-10-05', 'SEG'), done('2026-10-06', 'QUA')] });
    expect(list[0]!.date).toBe('2026-10-08');
  });

  it('sequência: o maior descanso da volta também não quebra', () => {
    const p = plan(['SEG', REST_SLOT, REST_SLOT, 'QUA', REST_SLOT], 6);
    expect(longestRestRun(p)).toBe(2);
    expect(maxRestGap(6, longestRestRun(p))).toBe(2);
    const d = sampleData();
    d.plans.p1 = p;
    for (const c of ['2026-10-03', '2026-10-06', '2026-10-09']) d.checkins[c] = { dayKey: null };
    expect(streakOf(d, new Date(2026, 9, 10, 20))).toBe(3);
  });

  it('editar a volta: pôr descanso ou repetir, mover e tirar só o que se repete', () => {
    let p = plan(['SEG', 'QUA', 'SEX']);
    p = addSlot(addSlot(p, REST_SLOT), 'QUA');
    expect(rotationSlots(p)).toEqual(['SEG', 'QUA', 'SEX', REST_SLOT, 'QUA']);
    expect(addSlot(p, 'TER')).toBe(p); // espaço vazio não entra
    expect(canRemoveSlot(p, 0)).toBe(false); // o único A
    expect(canRemoveSlot(p, 1)).toBe(true); // um dos B
    expect(canRemoveSlot(p, 3)).toBe(true); // descanso
    expect(removeSlot(p, 0)).toBe(p);
    expect(rotationSlots(removeSlot(p, 1))).toEqual(['SEG', 'SEX', REST_SLOT, 'QUA']);
    expect(rotationSlots(moveSlot(p, 3, -1))).toEqual(['SEG', 'QUA', REST_SLOT, 'SEX', 'QUA']);
    let full = p;
    while (rotationSlots(full).length < MAX_ROTATION_SLOTS) full = addSlot(full, REST_SLOT);
    expect(addSlot(full, REST_SLOT)).toBe(full);
  });

  it('treino esvaziado sai da volta inteira, repetições incluídas', () => {
    const p = plan(ABRCB);
    p.days.QUA = { ...p.days.QUA, exercises: [] };
    expect(rotationSlots(p)).toEqual(['SEG', REST_SLOT, 'SEX']);
  });

  it('plano compartilhado leva o descanso e as repetições', () => {
    const p = plan(ABRCB);
    const read = readPlanFile(JSON.stringify(exportPlan(p, false)), '2026-10-26', prefix => `${prefix}-1`);
    expect('plan' in read && read.plan.rotation?.order).toEqual(ABRCB);
  });
});

describe('T13: Novo neste treino', () => {
  const data = () => {
    const d = sampleData();
    d.plans.p1 = samplePlan(k => (k === 'SEG' ? [planExercise('e1', 'Supino Reto')] : []));
    d.activePlanId = 'p1';
    return d;
  };
  const finish = (d: ReturnType<typeof data>) => {
    let s = startSession(d, 'p1', 'SEG', new Date(2026, 9, 26, 18), 's1')!;
    s = addExerciseToSession(s, d, 'Rosca Direta');
    s = addExerciseToSession(s, d, 'Afundo');
    s = toggleSet(s, 0, 0);
    s = toggleSet(updateSet(s, 1, 0, { weight: 12, reps: 12 }), 1, 0);
    s = toggleSet(updateSet(s, 1, 1, { weight: 14, reps: 10 }), 1, 1);
    s = toggleSet(s, 2, 0);
    return sessionToWorkout(s, new Date(2026, 9, 26, 19))!;
  };

  it('marca o que foi acrescentado num treino do plano, não o do plano nem o trocado', () => {
    const d = data();
    const w = finish(d);
    expect(w.entries.map(e => [e.name, !!e.added])).toEqual([['Supino Reto', false], ['Rosca Direta', true], ['Afundo', true]]);
    let s = startSession(d, 'p1', 'SEG', new Date(2026, 9, 26, 18), 's2')!;
    s = toggleSet(swapExercise(s, d, 0, 'Supino Inclinado'), 0, 0);
    expect(sessionToWorkout(s, new Date(2026, 9, 26, 19))!.entries[0]!.added).toBeUndefined();
  });

  it('no treino livre não marca (lá tudo é acrescentado e "Salvar no plano" serve)', () => {
    let s = addExerciseToSession(startFreeSession(new Date(2026, 9, 26, 18), 's3'), data(), 'Rosca Direta');
    s = toggleSet(s, 0, 0);
    expect(sessionToWorkout(s, new Date(2026, 9, 26, 19))!.entries[0]!.added).toBeUndefined();
  });

  it('leva ao fim do dia do plano com as séries, as reps e a melhor carga de hoje', () => {
    const d = data();
    const w = finish(d);
    expect(addedEntries(d.plans.p1, w).map(e => e.name)).toEqual(['Rosca Direta', 'Afundo']);
    let n = 0;
    const p = addEntriesToPlan(d.plans.p1!, w, ['rosca direta'], () => `novo-${++n}`);
    expect(p.days.SEG.exercises.map(e => e.name)).toEqual(['Supino Reto', 'Rosca Direta']);
    expect(p.days.SEG.exercises[1]).toMatchObject({ id: 'novo-1', sets: 2, reps: 10, weight: 14 });
    // já no plano: sai da lista
    expect(addedEntries(p, w).map(e => e.name)).toEqual(['Afundo']);
    expect(addEntriesToPlan(p, w, ['rosca direta'])).toBe(p);
  });

  it('sem o plano, ou com outro plano, nada a oferecer', () => {
    const d = data();
    const w = finish(d);
    expect(addedEntries(undefined, w)).toEqual([]);
    expect(addedEntries({ ...d.plans.p1!, id: 'outro' }, w)).toEqual([]);
  });

  it('"Salvar no plano" passa a levar o por lado também', () => {
    const w: Workout = { ...done('2026-10-26', 'SEG'), entries: [{ key: 'afundo', name: 'Afundo', mode: 'reps', perSide: true, sets: [{ reps: 10, weight: 8, kind: 'work' }] }] };
    expect(workoutToPlanDay(w, () => 'x').exercises[0]).toMatchObject({ perSide: true, reps: 10, weight: 8 });
  });
});
