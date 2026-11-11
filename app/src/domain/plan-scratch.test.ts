// Plano do zero: nasce com a forma escolhida e o Início aponta para os exercícios.
import { expect, test } from 'vitest';
import { addPlan } from './actions';
import { todayCard } from './home';
import { addExercise, isPlannedEmpty, newPlanExercise, scratchPlan } from './plan-edit';
import { rotationLetter, rotationOrder } from './rotation';
import { sampleData } from './testing';

const MONDAY = new Date(2026, 10, 9, 10, 0);

test('semana fixa: os dias escolhidos nascem vazios e com nome, na ordem da semana', () => {
  const p = scratchPlan('x', '2026-11-09', { name: '  Força  ', days: ['SEX', 'SEG', 'QUA'], rotation: false });
  expect(p.name).toBe('Força');
  expect([p.days.SEG.name, p.days.QUA.name, p.days.SEX.name]).toEqual(['Treino A', 'Treino B', 'Treino C']);
  expect(p.days.TER.name).toBe('');
  expect(isPlannedEmpty(p.days.SEG)).toBe(true);
  expect(isPlannedEmpty(p.days.TER)).toBe(false);
  expect(p.rotation).toBeUndefined();
  expect(scratchPlan('y', '2026-11-09', { name: '', days: ['SEG'], rotation: false }).name).toBe('Meu treino');
});

test('rotação: meta da semana pelos dias escolhidos; as letras vêm na ordem em que os treinos são montados', () => {
  let p = scratchPlan('x', '2026-11-09', { name: 'ABC', days: ['SEG', 'TER', 'QUI', 'SEX'], rotation: true });
  expect(p.rotation).toEqual({ order: [], perWeek: 4 });
  expect(rotationOrder(p)).toEqual([]);
  p = addExercise(p, 'SEG', newPlanExercise('Supino Reto (Barra)'));
  expect(rotationLetter(p, 'SEG')).toBe('A');
});

test('Início: plano vazio pede os exercícios; com um exercício, volta ao normal', () => {
  const plan = scratchPlan('novo', '2026-11-09', { name: 'Meu treino', days: ['SEG', 'QUA'], rotation: false });
  const d = addPlan(sampleData(), plan, MONDAY).data;
  expect(todayCard(d, MONDAY, null)).toEqual({ kind: 'empty-plan', name: 'Meu treino' });
  const filled = addPlan(sampleData(), addExercise(plan, 'SEG', newPlanExercise('Agachamento Livre (Barra)')), MONDAY).data;
  expect(todayCard(filled, MONDAY, null)).toMatchObject({ kind: 'workout', title: 'Treino A', exercises: 1 });
});
