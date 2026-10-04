import { expect, test } from 'vitest';
import { addExercise, clearDay, deletePlan, editPlan, moveExercise, newPlanExercise, optionalHint, removeExercise, updateDay, updateExercise } from './plan-edit';
import { trainingDaysPerWeek } from './model';
import { planExercise, sampleData, samplePlan } from './testing';

const NOW = new Date('2026-10-07T12:00:00Z');

test('exercício novo: cardio pela biblioteca, força com 3 séries', () => {
  expect(newPlanExercise('Esteira', 'x')).toMatchObject({ mode: 'cardio', sets: 1, minutes: 20 });
  expect(newPlanExercise('  Supino Reto (Barra) ', 'x')).toMatchObject({ name: 'Supino Reto (Barra)', mode: 'reps', sets: 3, reps: 10 });
});

test('adicionar, editar, mover e remover no dia', () => {
  let plan = samplePlan();
  plan = addExercise(plan, 'DOM', newPlanExercise('Prancha', 'p'));
  expect(plan.days.DOM.exercises.map(e => e.id)).toEqual(['p']);
  expect(addExercise(plan, 'DOM', newPlanExercise(' ', 'v'))).toBe(plan);
  plan = updateExercise(plan, 'SEG', 'e2', { sets: 5 });
  expect(plan.days.SEG.exercises[1]!.sets).toBe(5);
  plan = moveExercise(plan, 'SEG', 'e2', -1);
  expect(plan.days.SEG.exercises.map(e => e.id)).toEqual(['e2', 'e1']);
  expect(moveExercise(plan, 'SEG', 'e2', -1)).toBe(plan);
  plan = removeExercise(plan, 'SEG', 'e1');
  expect(plan.days.SEG.exercises.map(e => e.id)).toEqual(['e2']);
  expect(removeExercise(plan, 'SEG', 'nada')).toBe(plan);
});

test('limite de exercícios por dia', () => {
  let plan = samplePlan(() => Array.from({ length: 10 }, (_, i) => planExercise(`e${i}`, `Ex ${i}`)));
  const before = plan;
  plan = addExercise(plan, 'SEG', newPlanExercise('Mais um', 'm'));
  expect(plan).toBe(before);
});

test('dias por semana contam só os obrigatórios com exercícios (O3)', () => {
  let plan = samplePlan();
  expect(trainingDaysPerWeek(plan)).toBe(6);
  plan = updateDay(plan, 'SAB', { optional: true });
  expect(trainingDaysPerWeek(plan)).toBe(5);
  plan = clearDay(plan, 'SEX');
  expect(plan.days.SEX).toEqual({ name: '', focus: '', optional: false, exercises: [] });
  expect(trainingDaysPerWeek(plan)).toBe(4);
});

test('texto do dia opcional descreve o estado (O8)', () => {
  expect(optionalHint(true)).toMatch(/continua/);
  expect(optionalHint(false)).toMatch(/zerada/);
});

test('editPlan carimba o plano e a data; sem mudança não altera nada', () => {
  const data = sampleData();
  const same = editPlan(data, 'p1', p => p, NOW);
  expect(same.data).toBe(data);
  const { data: next } = editPlan(data, 'p1', p => updateDay(p, 'SEG', { name: 'Peito' }), NOW);
  expect(next.plans.p1!.days.SEG.name).toBe('Peito');
  expect(next.plans.p1!.updatedAt).toBe('2026-10-07');
  expect(next.sync.changed['plan:p1']).toBe(NOW.toISOString());
  expect(data.plans.p1!.days.SEG.name).toBe('Treino SEG');
});

test('apagar plano: só o inativo, com registro de exclusão', () => {
  const data = sampleData();
  data.plans.p2 = { ...samplePlan(), id: 'p2' };
  expect(deletePlan(data, 'p1', NOW).data).toBe(data);
  const { data: next } = deletePlan(data, 'p2', NOW);
  expect(next.plans.p2).toBeUndefined();
  expect(next.sync.deleted['plan:p2']).toBe(NOW.toISOString());
});
