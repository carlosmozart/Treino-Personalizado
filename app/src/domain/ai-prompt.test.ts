import { expect, test } from 'vitest';
import { buildAiPrompt, suggestedGoal } from './ai-prompt';
import { parseAiPlan } from './ai-plan';
import { weeklyVolume } from './stats';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const NOW = new Date(2026, 9, 7, 12);
const base = { goal: 'hipertrofia' as const, days: 4, minutes: 60, notes: '', includeHealth: true, includeCurrent: true };

function data() {
  const d = sampleData({ workouts: [workout('2026-10-05', 'Supino Reto', [[8, 40], [8, 40]])] });
  d.plans.p1 = samplePlan(() => [planExercise('e1', 'Supino Reto'), planExercise('e2', 'Remada Curvada', { weight: 30 })]);
  d.profile = { ...d.profile, name: 'Ana', birthdate: '1990-01-01', sex: 'feminino', heightCm: 165, targetWeightKg: 70 };
  return d;
}

test('prompt com dados, carga real do histórico, volume e cuidado sem observações', () => {
  const text = buildAiPrompt(data(), base, NOW);
  expect(text).toContain('- Idade: 36 anos');
  expect(text).toContain('- Peso atual: 80 kg');
  expect(text).toContain('  - Supino Reto: 2x8 · 40kg (última vez em 05/10/2026)');
  expect(text).toContain('  - Remada Curvada: 3x10 · 30kg (ainda não registrado)');
  expect(text).toMatch(/05\/10 a 11\/10: 640 kg levantados em 1 treino/);
  expect(text).toContain('Não informei limitações físicas.');
  expect(text).toContain('1. NÃO invente cargas');
  expect(text).toContain('Monte um plano semanal com 4 dias de treino.');
});

test('sem saúde e sem treino atual: não manda dados nem a regra das cargas', () => {
  const text = buildAiPrompt(data(), { ...base, includeHealth: false, includeCurrent: false, notes: 'Dor no joelho' }, NOW);
  expect(text).not.toContain('## SOBRE MIM');
  expect(text).not.toContain('O QUE EU TREINO HOJE');
  expect(text).not.toContain('NÃO invente cargas');
  expect(text).toContain('Dor no joelho');
  expect(text).toContain('1. Para exercícios novos');
});

test('o exemplo de bloco do prompt é lido pelo próprio importador', () => {
  const text = buildAiPrompt(data(), base, NOW);
  const plan = parseAiPlan(text);
  expect(plan?.dias.map(d => d.dia)).toEqual(['SEG', 'TER']);
});

test('objetivo sugerido e volume semanal', () => {
  expect(suggestedGoal(data())).toBe('emagrecimento');
  const weeks = weeklyVolume(data(), NOW, 2);
  expect(weeks).toEqual([
    { start: '2026-09-28', end: '2026-10-04', volume: 0, workouts: 0 },
    { start: '2026-10-05', end: '2026-10-11', volume: 640, workouts: 1 }
  ]);
});
