import { expect, test } from 'vitest';
import { PLAN_TEMPLATES, templateById } from './plan-templates';
import { groupOf, isCardioName } from './exercise-library';
import { MAX_EXERCISES_PER_DAY, trainingDaysPerWeek } from '../domain/model';
import { addPlan } from '../domain/actions';
import { sampleData } from '../domain/testing';

const MONDAY = new Date(2026, 9, 5, 9);

test('cada modelo monta um plano válido, só com nomes da biblioteca e modo coerente', () => {
  const ids = new Set<string>();
  for (const t of PLAN_TEMPLATES) {
    expect(ids.has(t.id), t.id).toBe(false);
    ids.add(t.id);
    const plan = t.build('2026-10-05', 'p-x');
    expect(plan.id).toBe('p-x');
    expect(plan.createdAt).toBe('2026-10-05');
    expect(trainingDaysPerWeek(plan)).toBeGreaterThanOrEqual(3);
    for (const [k, day] of Object.entries(plan.days)) {
      expect(day.exercises.length, `${t.id} ${k}`).toBeLessThanOrEqual(MAX_EXERCISES_PER_DAY);
      expect(new Set(day.exercises.map(e => e.id)).size).toBe(day.exercises.length);
      if (t.id === 'default') continue; // plano original: nomes próprios, com cargas
      for (const e of day.exercises) {
        expect(groupOf(e.name), e.name).not.toBeNull();
        expect(e.mode === 'cardio', e.name).toBe(isCardioName(e.name));
        expect(e.weight).toBe(0);
        if (e.mode === 'time') expect(e.seconds).toBeGreaterThan(0);
        if (e.mode === 'reps') expect(e.reps).toBeGreaterThan(0);
        if (e.mode === 'cardio') expect(e.minutes).toBeGreaterThan(0);
      }
    }
  }
});

test('o nome do dia leva o dia da semana, como no plano original', () => {
  const plan = templateById('superior-inferior')!.build('2026-10-05', 'p');
  expect(plan.days.SEG.name).toBe('Segunda: Superior A');
  expect(plan.days.QUA.exercises).toEqual([]);
  expect(trainingDaysPerWeek(plan)).toBe(4);
});

test('dois planos do mesmo modelo são independentes', () => {
  const t = templateById('corpo-inteiro')!;
  const a = t.build('2026-10-05', 'a');
  const b = t.build('2026-10-05', 'b');
  a.days.SEG.exercises[0]!.sets = 9;
  expect(b.days.SEG.exercises[0]!.sets).toBe(3);
  expect(a.days.SEX.exercises[0]!.sets).toBe(3); // SEG e SEX usam o mesmo treino A, sem compartilhar objetos
  const data = addPlan(sampleData(), a, MONDAY).data;
  expect(data.activePlanId).toBe('a');
});
