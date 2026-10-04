import { expect, test } from 'vitest';
import { parseAiPlan } from './ai-plan';
import { aiPlanToPlan } from './ai-plan-import';
import { trainingDaysPerWeek } from './model';

const opts = () => {
  let n = 0;
  return { id: 'ia', name: 'Plano IA', today: '2026-10-04', makeId: () => `ex${++n}`, isCardioName: (name: string) => /esteira|bike/i.test(name) };
};

test('converte dias, metas, alternativas e classifica cardio e tempo', () => {
  const ai = parseAiPlan(`[PLANO]
    DIA|SEG|Peito|Hipertrofia|
    EX|Supino Reto|forca|4|8|60|Supino com Halteres|
    EX|Prancha|tempo|3|45|
    DIA|QUA||Condicionamento|
    EX|Bike|cardio|1|30|0|Esteira|
    [FIM]`)!;
  const { plan, notes, exerciseCount, dayCount } = aiPlanToPlan(ai, opts());
  expect(exerciseCount).toBe(3);
  expect(dayCount).toBe(2);
  expect(plan.days.SEG.exercises[0]).toEqual({
    id: 'ex1', name: 'Supino Reto', mode: 'reps', sets: 4, reps: 8, weight: 60, minutes: 20, km: 0, optional: false,
    alternatives: [{ name: 'Supino com Halteres', mode: 'reps' }]
  });
  expect(plan.days.SEG.exercises[1]).toMatchObject({ mode: 'time', sets: 3, seconds: 45 });
  expect(plan.days.QUA).toMatchObject({ name: 'Quarta: Treino', focus: 'Condicionamento' });
  expect(plan.days.QUA.exercises[0]).toMatchObject({ mode: 'cardio', minutes: 30, optional: true, alternatives: [{ name: 'Esteira', mode: 'cardio' }] });
  expect(plan.days.TER.exercises).toEqual([]);
  expect(notes).toHaveLength(2);
  expect(trainingDaysPerWeek(plan)).toBe(2);
});

test('limita exercícios por dia e avisa', () => {
  const linhas = Array.from({ length: 12 }, (_, i) => `EX|Exercício ${i + 1}|forca|3|10|0|`).join('\n');
  const ai = parseAiPlan(`[PLANO]\nDIA|SEX|Tudo||\n${linhas}\n[FIM]`)!;
  const { plan, notes } = aiPlanToPlan(ai, opts());
  expect(plan.days.SEX.exercises).toHaveLength(10);
  expect(notes[0]).toContain('Os últimos 2 ficaram de fora');
});
