// Modelos de plano prontos para carregar e editar (M45). Só nomes da biblioteca, para ter
// ilustração e grupo muscular; cargas em zero: cada pessoa preenche no primeiro treino.
import { DAY_KEYS, type DayKey } from '../domain/ai-plan';
import type { DateKey } from '../domain/dates';
import { DAY_FULL_NAMES, type ExerciseMode, type Plan, type PlanDay, type PlanExercise } from '../domain/model';
import { SEED_PLAN_ID, seedPlan } from './seed-plan';

export type TemplateLevel = 'Iniciante' | 'Intermediário' | 'Avançado';

export interface PlanTemplate {
  id: string;
  name: string;
  level: TemplateLevel;
  /** Uma linha: para quem é e como se organiza a semana. */
  summary: string;
  build(today: DateKey, id: string): Plan;
}

interface ExOpts { rest?: number; optional?: boolean; tip?: string }
type ExSpec = Omit<PlanExercise, 'id'>;

/** Série de repetições; descanso padrão de 90 s. */
const reps = (name: string, sets: number, n: number, o: ExOpts = {}): ExSpec => spec(name, 'reps', sets, { reps: n }, o);
/** Isometria em segundos (prancha). */
const hold = (name: string, sets: number, seconds: number, o: ExOpts = {}): ExSpec => spec(name, 'time', sets, { reps: 0, seconds }, o);
/** Cardio em minutos, uma "série". */
const cardio = (name: string, minutes: number, o: ExOpts = {}): ExSpec => spec(name, 'cardio', 1, { reps: 0, minutes }, o);

function spec(name: string, mode: ExerciseMode, sets: number, v: { reps: number; seconds?: number; minutes?: number }, o: ExOpts): ExSpec {
  return {
    name, mode, sets, reps: v.reps, weight: 0, minutes: v.minutes ?? 0, km: 0,
    ...(v.seconds ? { seconds: v.seconds } : {}),
    restSeconds: o.rest ?? (mode === 'cardio' ? 0 : 90),
    ...(o.tip ? { tip: o.tip } : {}),
    optional: o.optional ?? false, alternatives: []
  };
}

interface DaySpec { name: string; focus: string; optional?: boolean; exercises: ExSpec[] }

function makePlan(today: DateKey, id: string, name: string, description: string, days: Partial<Record<DayKey, DaySpec>>): Plan {
  const built = Object.fromEntries(DAY_KEYS.map(k => {
    const d = days[k];
    const day: PlanDay = d
      ? { name: `${DAY_FULL_NAMES[k]}: ${d.name}`, focus: d.focus, optional: d.optional ?? false,
          exercises: d.exercises.map((e, i) => ({ ...structuredClone(e), id: `${k.toLowerCase()}_${i + 1}` })) }
      : { name: '', focus: '', optional: false, exercises: [] };
    return [k, day];
  })) as Plan['days'];
  return { id, name, description, trainingTime: '', createdAt: today, updatedAt: today, days: built };
}

const CARGA = 'Escolha uma carga em que as 2 últimas repetições fiquem difíceis, sem perder a técnica.';

// ---- Corpo inteiro 3x (A/B alternados) ----
const fullA: DaySpec = {
  name: 'Corpo inteiro A', focus: 'Pernas, empurrar e puxar',
  exercises: [
    reps('Leg Press 45º', 3, 12, { rest: 120, tip: CARGA }),
    reps('Supino Reto (Halteres)', 3, 10, { rest: 120 }),
    reps('Puxada Frontal (Polia)', 3, 10, { rest: 120 }),
    reps('Desenvolvimento Máquina', 3, 12),
    reps('Mesa Flexora', 3, 12),
    hold('Prancha Isométrica', 3, 30, { rest: 60 }),
    cardio('Esteira', 15, { optional: true })
  ]
};
const fullB: DaySpec = {
  name: 'Corpo inteiro B', focus: 'Pernas, puxar e braços',
  exercises: [
    reps('Agachamento Smith', 3, 10, { rest: 120, tip: CARGA }),
    reps('Remada Baixa (Polia)', 3, 10, { rest: 120 }),
    reps('Supino Inclinado (Halteres)', 3, 10, { rest: 120 }),
    reps('Elevação Lateral (Halteres)', 3, 12, { rest: 60 }),
    reps('Elevação Pélvica (Hip Thrust)', 3, 12),
    reps('Rosca Direta (Polia)', 2, 12, { rest: 60 }),
    reps('Tríceps Pulley (Corda)', 2, 12, { rest: 60 }),
    cardio('Bicicleta Ergométrica', 15, { optional: true })
  ]
};

// ---- Superior / Inferior 4x ----
const upperA: DaySpec = {
  name: 'Superior A', focus: 'Peito e costas, ênfase em força',
  exercises: [
    reps('Supino Reto (Barra)', 4, 8, { rest: 150 }),
    reps('Remada Curvada (Barra)', 4, 8, { rest: 150 }),
    reps('Desenvolvimento com Halteres', 3, 10, { rest: 120 }),
    reps('Puxada Frontal (Polia)', 3, 10, { rest: 120 }),
    reps('Rosca Direta (Barra)', 3, 10, { rest: 60 }),
    reps('Tríceps Pulley (Barra)', 3, 10, { rest: 60 })
  ]
};
const lowerA: DaySpec = {
  name: 'Inferior A', focus: 'Quadríceps e posterior',
  exercises: [
    reps('Agachamento Livre', 4, 8, { rest: 180, tip: 'Desça até onde mantiver a coluna neutra; o Agachamento Smith é uma boa troca.' }),
    reps('Levantamento Terra Romeno', 3, 10, { rest: 150 }),
    reps('Leg Press 45º', 3, 12, { rest: 120 }),
    reps('Mesa Flexora', 3, 12),
    reps('Panturrilha em Pé', 4, 12, { rest: 60 }),
    reps('Abdominal na Polia', 3, 15, { rest: 60 })
  ]
};
const upperB: DaySpec = {
  name: 'Superior B', focus: 'Ombros e costas, ênfase em volume',
  exercises: [
    reps('Supino Inclinado (Halteres)', 3, 10, { rest: 120 }),
    reps('Remada Unilateral (Halter)', 3, 10, { rest: 90 }),
    reps('Peck Deck (Voador)', 3, 12, { rest: 60 }),
    reps('Elevação Lateral (Halteres)', 4, 12, { rest: 60 }),
    reps('Face Pull', 3, 15, { rest: 60 }),
    reps('Rosca Martelo', 3, 12, { rest: 60 }),
    reps('Tríceps Francês', 3, 12, { rest: 60 })
  ]
};
const lowerB: DaySpec = {
  name: 'Inferior B', focus: 'Glúteo e posterior',
  exercises: [
    reps('Agachamento Búlgaro', 3, 10, { rest: 120 }),
    reps('Elevação Pélvica (Hip Thrust)', 4, 10, { rest: 120 }),
    reps('Cadeira Extensora', 3, 12),
    reps('Cadeira Flexora', 3, 12),
    reps('Panturrilha Sentado', 4, 15, { rest: 60 }),
    hold('Prancha Isométrica', 3, 45, { rest: 60 })
  ]
};

// ---- ABC 3x ----
const abcA: DaySpec = {
  name: 'A: Peito, ombro e tríceps', focus: 'Empurrar',
  exercises: [
    reps('Supino Reto (Barra)', 4, 10, { rest: 120 }),
    reps('Supino Inclinado (Halteres)', 3, 10, { rest: 90 }),
    reps('Crossover (Polia Alta)', 3, 12, { rest: 60 }),
    reps('Desenvolvimento com Halteres', 3, 10),
    reps('Elevação Lateral (Halteres)', 3, 12, { rest: 60 }),
    reps('Tríceps Pulley (Corda)', 3, 12, { rest: 60 }),
    reps('Tríceps Testa (Barra/Halteres)', 3, 10, { rest: 60 })
  ]
};
const abcB: DaySpec = {
  name: 'B: Costas e bíceps', focus: 'Puxar',
  exercises: [
    reps('Puxada Frontal (Polia)', 4, 10, { rest: 120 }),
    reps('Remada Curvada (Barra)', 3, 10, { rest: 120 }),
    reps('Remada Baixa (Polia)', 3, 12),
    reps('Pulldown (Corda)', 3, 12, { rest: 60 }),
    reps('Rosca Direta (Barra)', 3, 10, { rest: 60 }),
    reps('Rosca Martelo', 3, 12, { rest: 60 }),
    reps('Abdominal Infra', 3, 15, { rest: 60 })
  ]
};
const abcC: DaySpec = {
  name: 'C: Pernas', focus: 'Quadríceps, posterior e panturrilha',
  exercises: [
    reps('Agachamento Livre', 4, 10, { rest: 150 }),
    reps('Leg Press 45º', 3, 12, { rest: 120 }),
    reps('Cadeira Extensora', 3, 12),
    reps('Stiff (Halteres/Barra)', 3, 10, { rest: 120 }),
    reps('Mesa Flexora', 3, 12),
    reps('Panturrilha no Leg Press', 4, 15, { rest: 60 })
  ]
};

// ---- Push / Pull / Legs 6x ----
const push = (n: 'A' | 'B'): DaySpec => ({
  name: `Push ${n}: Peito, ombro e tríceps`, focus: n === 'A' ? 'Ênfase em peito' : 'Ênfase em ombro',
  exercises: n === 'A' ? [
    reps('Supino Reto (Barra)', 4, 8, { rest: 150 }),
    reps('Supino Inclinado (Halteres)', 3, 10, { rest: 120 }),
    reps('Crossover (Polia Baixa)', 3, 12, { rest: 60 }),
    reps('Elevação Lateral (Halteres)', 3, 12, { rest: 60 }),
    reps('Tríceps Pulley (Corda)', 3, 12, { rest: 60 }),
    reps('Tríceps Francês', 3, 10, { rest: 60 })
  ] : [
    reps('Desenvolvimento Militar (Barra)', 4, 8, { rest: 150 }),
    reps('Supino Articulado', 3, 10, { rest: 120 }),
    reps('Peck Deck (Voador)', 3, 12, { rest: 60 }),
    reps('Elevação Lateral (Polia)', 3, 12, { rest: 60 }),
    reps('Paralelas / Mergulho (Dips)', 3, 10, { rest: 90 }),
    reps('Tríceps Pulley (Barra)', 3, 12, { rest: 60 })
  ]
});
const pull = (n: 'A' | 'B'): DaySpec => ({
  name: `Pull ${n}: Costas e bíceps`, focus: n === 'A' ? 'Largura das costas' : 'Espessura das costas',
  exercises: n === 'A' ? [
    reps('Barra Fixa (Pull-up)', 4, 8, { rest: 150, tip: 'Sem conseguir 8? Troque pela Puxada Frontal (Polia).' }),
    reps('Remada Baixa (Polia)', 3, 10, { rest: 120 }),
    reps('Pulldown (Corda)', 3, 12, { rest: 60 }),
    reps('Face Pull', 3, 15, { rest: 60 }),
    reps('Rosca Direta (Barra)', 3, 10, { rest: 60 }),
    reps('Rosca Martelo', 3, 12, { rest: 60 })
  ] : [
    reps('Remada Curvada (Barra)', 4, 8, { rest: 150 }),
    reps('Puxada Triângulo', 3, 10, { rest: 120 }),
    reps('Remada Unilateral (Halter)', 3, 10, { rest: 90 }),
    reps('Crucifixo Invertido (Máquina)', 3, 15, { rest: 60 }),
    reps('Rosca Scott (Barra W)', 3, 10, { rest: 60 }),
    reps('Rosca Concentrada', 2, 12, { rest: 60 })
  ]
});
const legs = (n: 'A' | 'B'): DaySpec => ({
  name: `Legs ${n}: Pernas`, focus: n === 'A' ? 'Ênfase em quadríceps' : 'Ênfase em posterior e glúteo',
  exercises: n === 'A' ? [
    reps('Agachamento Livre', 4, 8, { rest: 180 }),
    reps('Leg Press 45º', 3, 12, { rest: 120 }),
    reps('Cadeira Extensora', 3, 12),
    reps('Mesa Flexora', 3, 12),
    reps('Panturrilha em Pé', 4, 12, { rest: 60 }),
    reps('Abdominal na Polia', 3, 15, { rest: 60 })
  ] : [
    reps('Levantamento Terra Romeno', 4, 8, { rest: 180 }),
    reps('Elevação Pélvica (Hip Thrust)', 3, 10, { rest: 120 }),
    reps('Agachamento Búlgaro', 3, 10, { rest: 120 }),
    reps('Cadeira Flexora', 3, 12),
    reps('Panturrilha Sentado', 4, 15, { rest: 60 }),
    hold('Prancha Isométrica', 3, 45, { rest: 60 })
  ]
});

// ---- Força 5×5 (A/B alternados) ----
const fiveA: DaySpec = {
  name: 'Força A', focus: 'Agachamento, supino e remada',
  exercises: [
    reps('Agachamento Livre', 5, 5, { rest: 180, tip: 'Completou 5×5? Some 2,5 kg no próximo treino.' }),
    reps('Supino Reto (Barra)', 5, 5, { rest: 180 }),
    reps('Remada Curvada (Barra)', 5, 5, { rest: 180 })
  ]
};
const fiveB: DaySpec = {
  name: 'Força B', focus: 'Agachamento, desenvolvimento e terra',
  exercises: [
    reps('Agachamento Livre', 5, 5, { rest: 180, tip: 'Completou 5×5? Some 2,5 kg no próximo treino.' }),
    reps('Desenvolvimento Militar (Barra)', 5, 5, { rest: 180 }),
    reps('Levantamento Terra', 1, 5, { rest: 180, tip: 'Só uma série pesada de 5; aqueça antes com cargas menores.' })
  ]
};

// ---- Em casa, peso do corpo 3x ----
const home: DaySpec = {
  name: 'Corpo inteiro em casa', focus: 'Peso do corpo, sem aparelhos',
  exercises: [
    reps('Agachamento Livre', 3, 15, { rest: 60, tip: 'Sem barra: só o peso do corpo, ou segurando uma mochila com peso.' }),
    reps('Flexão de Braço (Solo)', 3, 10, { rest: 60, tip: 'Difícil? Apoie os joelhos no chão ou as mãos num banco.' }),
    reps('Afundo (Passada)', 3, 10, { rest: 60 }),
    reps('Mergulho no Banco', 3, 10, { rest: 60 }),
    reps('Elevação Pélvica (Hip Thrust)', 3, 15, { rest: 60 }),
    reps('Panturrilha em Pé', 3, 20, { rest: 45 }),
    hold('Prancha Isométrica', 3, 30, { rest: 45 }),
    reps('Abdominal Infra', 3, 15, { rest: 45 })
  ]
};

export const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  {
    id: 'corpo-inteiro', name: 'Corpo inteiro 3×', level: 'Iniciante',
    summary: 'Seg, qua e sex, dois treinos alternados que trabalham o corpo todo. Bom para começar ou voltar.',
    build: (today, id) => makePlan(today, id, 'Corpo inteiro 3×',
      'Treinos A e B alternados, 3 dias por semana. Cardio opcional no fim.', { SEG: fullA, QUA: fullB, SEX: fullA })
  },
  {
    id: 'em-casa', name: 'Em casa 3×', level: 'Iniciante',
    summary: 'Seg, qua e sex com o peso do corpo, sem academia.',
    build: (today, id) => makePlan(today, id, 'Em casa 3×',
      'Corpo inteiro com o peso do corpo. Quando ficar fácil, aumente as repetições ou segure mais tempo.', { SEG: home, QUA: home, SEX: home })
  },
  {
    id: 'abc', name: 'ABC 3×', level: 'Intermediário',
    summary: 'Seg, qua e sex: A empurrar, B puxar, C pernas. Cada grupo uma vez por semana.',
    build: (today, id) => makePlan(today, id, 'ABC 3×',
      'A: peito, ombro e tríceps. B: costas e bíceps. C: pernas.', { SEG: abcA, QUA: abcB, SEX: abcC })
  },
  {
    id: 'superior-inferior', name: 'Superior / Inferior 4×', level: 'Intermediário',
    summary: 'Seg, ter, qui e sex: cada grupo duas vezes por semana.',
    build: (today, id) => makePlan(today, id, 'Superior / Inferior 4×',
      'Superior e inferior alternados, 4 dias por semana, com quarta e fim de semana livres.',
      { SEG: upperA, TER: lowerA, QUI: upperB, SEX: lowerB })
  },
  {
    id: 'ppl', name: 'Push / Pull / Legs 6×', level: 'Avançado',
    summary: 'Seg a sáb: empurrar, puxar e pernas, duas vezes por semana.',
    build: (today, id) => makePlan(today, id, 'Push / Pull / Legs 6×',
      'Empurrar, puxar e pernas duas vezes por semana, com variações A e B. Domingo livre.',
      { SEG: push('A'), TER: pull('A'), QUA: legs('A'), QUI: push('B'), SEX: pull('B'), SAB: legs('B') })
  },
  {
    id: 'forca-5x5', name: 'Força 5×5', level: 'Intermediário',
    summary: 'Seg, qua e sex: poucos exercícios básicos e pesados, subindo a carga a cada treino.',
    build: (today, id) => makePlan(today, id, 'Força 5×5',
      'Treinos A e B alternados (A-B-A numa semana, B-A-B na outra: troque o dia no seletor). Completou todas as séries? Suba a carga.',
      { SEG: fiveA, QUA: fiveB, SEX: fiveA })
  },
  {
    id: SEED_PLAN_ID, name: 'PPL do app original', level: 'Avançado',
    summary: 'O plano de exemplo das versões anteriores: 6 dias e domingo opcional, com cargas de referência.',
    build: (today, id) => seedPlan(today, id)
  }
];

export function templateById(id: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find(t => t.id === id);
}
