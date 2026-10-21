import { expect, test } from 'vitest';
import { parseAiPlan } from './ai-plan';
import { applyReview, buildReviewPrompt, planBlock, reviewChanges } from './ai-review';
import type { Plan } from './model';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const NOW = new Date(2026, 9, 21, 12);
let n = 0;
const opts = { makeId: () => `novo${++n}`, isCardioName: (name: string) => /esteira/i.test(name) };

/** Plano de dois dias: SEG com supino (faixa) e remada (com reserva e descanso próprio), QUA com prancha e esteira. */
function plan(): Plan {
  const p = samplePlan(() => []);
  p.days.SEG = { name: 'Peito e costas', focus: 'Superior', optional: false, exercises: [
    planExercise('e1', 'Supino Reto (Barra)', { sets: 3, reps: 12, repMin: 8, repMax: 12, weight: 40 }),
    planExercise('e2', 'Remada Curvada (Barra)', { weight: 30, restSeconds: 90, tip: 'costas retas', alternatives: [{ name: 'Remada Baixa (Polia)', mode: 'reps' }] })
  ] };
  p.days.QUA = { name: 'Core', focus: '', optional: false, exercises: [
    planExercise('e3', 'Prancha Isométrica', { mode: 'time', seconds: 30, weight: 0 }),
    planExercise('e4', 'Esteira', { mode: 'cardio', minutes: 15, sets: 1, weight: 0, optional: true })
  ] };
  return p;
}

const answer = (lines: string[]) => parseAiPlan(['```', '[PLANO]', ...lines, '[FIM]', '```'].join('\n'))!;

test('o plano no bloco volta igual: devolver sem mudanças não gera mudança nenhuma', () => {
  const block = planBlock(plan());
  expect(block).toContain('EX | Supino Reto (Barra) | forca | 3 | 8-12 | 40 | ');
  expect(block).toContain('EX | Remada Curvada (Barra) | forca | 3 | 10 | 30 | Remada Baixa (Polia)');
  expect(block).toContain('EX | Prancha Isométrica | tempo | 3 | 30 |  | ');
  expect(reviewChanges(plan(), parseAiPlan(block.join('\n'))!, opts).changes).toEqual([]);
});

test('pedido de revisão: plano atual no bloco, últimas sessões reais, frequência e motivo no bloco', () => {
  const d = sampleData({ workouts: [workout('2026-10-14', 'Supino Reto (Barra)', [[12, 40], [12, 40], [10, 40]]), workout('2026-10-20', 'Supino Reto (Barra)', [[12, 40], [12, 40], [12, 40]])] });
  const text = buildReviewPrompt(d, plan(), { goal: 'hipertrofia', notes: '' }, NOW);
  expect(text).toContain('## MEU PLANO ATUAL\n```\n[PLANO]\nDIA | SEG | Peito e costas | Superior');
  expect(text).toContain('- Supino Reto (Barra): 14/10 12/12/10 · 40kg | 20/10 3x12 · 40kg');
  expect(text).toContain('- Remada Curvada (Barra): ainda não registrado');
  expect(text).toMatch(/Treinos por semana: .*: 1 · .*: 1/);
  expect(text).toContain('nome | tipo | séries | repetições | carga | alternativa | motivo');
  expect(text).toContain('Vazia quer dizer "manter a atual"');
  // o bloco do plano atual dentro do pedido é lido como plano (quem cola o pedido inteiro não quebra nada)
  expect(parseAiPlan(text)!.dias.map(x => x.dia)).toEqual(['SEG', 'QUA']);
});

test('alterar, trocar, incluir e tirar, com motivo; carga vazia mantém a atual', () => {
  const ai = answer([
    'DIA | SEG | Peito e costas | Superior',
    'EX | Supino Reto (Barra) | forca | 4 | 6-10 | 45 | | carga parada há 3 semanas',
    'EX | Remada Baixa (Polia) | forca | 3 | 12 | | | poupa a lombar',
    'EX | Face Pull | forca | 3 | 15 | | | ombro posterior',
    'DIA | QUA | Core |',
    'EX | Prancha Isométrica | tempo | 3 | 45 | | | ',
    'EX | Esteira | cardio | 1 | 15 | |'
  ]);
  const { changes } = reviewChanges(plan(), ai, opts);
  expect(changes.map(c => [c.day, c.kind, c.details.join('; '), c.reason ?? ''])).toEqual([
    ['SEG', 'change', 'Séries: 3 → 4; Repetições: 8–12 → 6–10; Carga: 40 kg → 45 kg', 'carga parada há 3 semanas'],
    ['SEG', 'swap', 'Remada Curvada (Barra) → Remada Baixa (Polia); 3 × 12', 'poupa a lombar'],
    ['SEG', 'add', '3 × 15', 'ombro posterior'],
    ['QUA', 'change', 'Segundos: 30 → 45', '']
  ]);
});

test('aplica só o que foi aprovado e preserva o resto do exercício', () => {
  const ai = answer([
    'DIA | SEG | Peito e costas |',
    'EX | Supino Reto (Barra) | forca | 4 | 8-12 | | | mais volume',
    'EX | Remada Curvada (Barra) | forca | 4 | 10 | | | mais volume',
    'DIA | SEX | Pernas | Inferior',
    'EX | Agachamento Livre | forca | 4 | 8 | | |',
    'DIA | QUA | Core |',
    'EX | Prancha Isométrica | tempo | 3 | 30 | |'
  ]);
  const review = reviewChanges(plan(), ai, opts);
  // supino 4 séries, remada 4 séries, agachamento na sexta (dia vazio), esteira sai
  expect(review.changes.map(c => `${c.day} ${c.kind}`)).toEqual(['SEG change', 'SEG change', 'QUA remove', 'SEX add']);
  const [supino, , esteira, agacho] = review.changes;
  const { plan: out, skipped } = applyReview(plan(), review, new Set([supino!.id, esteira!.id, agacho!.id]));
  expect(skipped).toBe(0);
  expect(out.days.SEG.exercises[0]).toMatchObject({ id: 'e1', sets: 4, weight: 40, repMin: 8, repMax: 12 });
  // a remada não foi aprovada: igual ao que era, com reserva, dica e descanso
  expect(out.days.SEG.exercises[1]).toEqual(plan().days.SEG.exercises[1]);
  expect(out.days.QUA.exercises.map(e => e.name)).toEqual(['Prancha Isométrica']);
  expect(out.days.SEX).toMatchObject({ name: 'Pernas', focus: 'Inferior' });
  expect(out.days.SEX.exercises[0]).toMatchObject({ name: 'Agachamento Livre', sets: 4, reps: 8 });
  // nada aprovado: o plano fica como estava
  expect(applyReview(plan(), review, new Set()).plan.days).toEqual(plan().days);
});
