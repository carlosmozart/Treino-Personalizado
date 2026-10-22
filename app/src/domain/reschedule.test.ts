import { expect, test } from 'vitest';
import { nextWorkoutAfterToday, todayCard, weekStrip } from './home';
import { remindersFor } from './reminders';
import { canMove, moveTargets, moveWorkout, scheduledDay, undoMove } from './reschedule';
import { streakOf } from './rewards';
import { mergeAppData } from './sync';
import type { AppData } from './model';
import { planExercise, sampleData, samplePlan } from './testing';

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour); // 19/10/2026 é segunda
const MON = at(19), TUE = at(20);

/** Segunda, quarta e sexta com treino; os outros dias, descanso. */
function data(): AppData {
  const plan = samplePlan(k => (['SEG', 'QUA', 'SEX'].includes(k) ? [planExercise('e1', 'Supino Reto')] : []));
  plan.trainingTime = '18:00';
  return sampleData({ plans: { p1: plan } });
}
const moved = (d = data()) => moveWorkout(d, '2026-10-19', '2026-10-20', MON).data;

test('os dias para onde dá para remarcar: só os livres, nos 6 dias seguintes', () => {
  const d = data();
  d.dayNotes = { '2026-10-25': { reason: 'viajando' } };
  expect(moveTargets(d, d.plans.p1!, '2026-10-19').map(t => (t.free ? `${t.date} livre` : `${t.date} ${t.why}`))).toEqual([
    '2026-10-20 livre', '2026-10-21 treino', '2026-10-22 livre', '2026-10-23 treino', '2026-10-24 livre', '2026-10-25 nota'
  ]);
});

test('remarcar a segunda para a terça: hoje vira descanso e a terça ganha o treino, sem mudar o plano', () => {
  const d = moved();
  const plan = d.plans.p1!;
  expect(plan).toEqual(data().plans.p1);
  expect([scheduledDay(plan, '2026-10-19', d.moves), scheduledDay(plan, '2026-10-20', d.moves)]).toEqual([null, 'SEG']);
  expect(d.sync.changed['move:2026-10-19']).toBeDefined();
  expect(d.sync.changed['move:2026-10-20']).toBeDefined();

  expect(todayCard(d, MON, null)).toEqual({ kind: 'rest', next: { dayKey: 'SEG', title: 'Treino SEG', inDays: 1 }, movedTo: '2026-10-20' });
  expect(todayCard(d, TUE, null)).toMatchObject({ kind: 'workout', dayKey: 'SEG', movedFrom: '2026-10-19', doneToday: false });
  expect(nextWorkoutAfterToday(d, MON)).toEqual({ title: 'Treino SEG', when: 'amanhã' });
  expect(weekStrip(d, MON).slice(0, 3).map(x => [x.planned, x.moved])).toEqual([[false, 'out'], [true, 'in'], [true, null]]);
});

test('o lembrete vai junto: não toca no dia de onde saiu e toca no dia novo', () => {
  const d = moved();
  const list = remindersFor(d.plans.p1, { moves: d.moves!, now: MON }).slice(0, 3);
  expect(list.map(r => `${r.date} ${r.body}`)).toEqual(['2026-10-20 Hoje: Treino SEG', '2026-10-21 Hoje: Treino QUA', '2026-10-23 Hoje: Treino SEX']);
});

test('o dia de onde o treino saiu não quebra a sequência; o dia novo passa a contar', () => {
  const trained = (d: AppData) => { for (const k of ['2026-10-12', '2026-10-14', '2026-10-16']) d.checkins[k] = { dayKey: null }; return d; };
  // terça à noite, sem treinar: sem remarcar, a segunda perdida quebrou a sequência
  expect(streakOf(trained(data()), at(20, 21))).toBe(0);
  expect(streakOf(trained(moved()), at(20, 21))).toBe(3);
  // quarta: a terça (com o treino remarcado) passou em branco e quebra
  expect(streakOf(trained(moved()), at(21, 21))).toBe(0);
});

test('remarcar de novo não encadeia: a origem aponta para o dia novo e o do meio volta a ser descanso', () => {
  const d = moveWorkout(moved(), '2026-10-20', '2026-10-22', TUE).data;
  expect(d.moves).toEqual({
    '2026-10-19': { planId: 'p1', day: null, to: '2026-10-22' },
    '2026-10-22': { planId: 'p1', day: 'SEG', from: '2026-10-19' }
  });
  expect(scheduledDay(d.plans.p1!, '2026-10-20', d.moves)).toBeNull();
  expect(d.sync.deleted['move:2026-10-20']).toBeDefined();
});

test('desfazer devolve o treino para hoje; não devolve para um dia que já passou nem depois de treinar', () => {
  const d = moved();
  const undone = undoMove(d, '2026-10-20', MON).data;
  expect(undone.moves).toEqual({});
  expect(undone.sync.deleted['move:2026-10-19']).toBeDefined();
  expect(todayCard(undone, MON, null)).toMatchObject({ kind: 'workout', dayKey: 'SEG' });
  expect(undoMove(d, '2026-10-20', TUE).data).toBe(d);
  const done = { ...d, checkins: { '2026-10-20': { dayKey: 'SEG' as const } } };
  expect(undoMove(done, '2026-10-19', MON).data).toBe(done);
});

test('recusa: dia ocupado, dia já treinado, data passada, rotação e plano de outra remarcação', () => {
  const d = data();
  expect(moveWorkout(d, '2026-10-19', '2026-10-21', MON).data).toBe(d);
  expect(moveWorkout(d, '2026-10-19', '2026-10-26', MON).data).toBe(d);
  expect(moveWorkout(d, '2026-10-19', '2026-10-20', TUE).data).toBe(d);
  const trained = { ...d, checkins: { '2026-10-19': { dayKey: 'SEG' as const } } };
  expect(moveWorkout(trained, '2026-10-19', '2026-10-20', MON).data).toBe(trained);
  const rot = data();
  rot.plans.p1!.rotation = { order: ['SEG', 'QUA', 'SEX'], perWeek: 3 };
  expect(canMove(rot, rot.plans.p1!, '2026-10-19', MON)).toBe(false);
  // trocar de plano: a remarcação do plano anterior não vale no novo
  const other = moved();
  other.plans.p2 = { ...other.plans.p1!, id: 'p2' };
  other.activePlanId = 'p2';
  expect(todayCard(other, MON, null)).toMatchObject({ kind: 'workout', dayKey: 'SEG' });
});

test('juntar dois aparelhos leva a remarcação e o desfazer', () => {
  const base = data();
  const local = moved(base);
  expect(mergeAppData(base, local).moves).toEqual(local.moves);
  const undone = undoMove(local, '2026-10-19', at(19, 10)).data;
  expect(mergeAppData(local, undone).moves).toBeUndefined();
});
