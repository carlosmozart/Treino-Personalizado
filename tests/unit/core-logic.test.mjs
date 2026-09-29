import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { loadInlineFunctions } from '../helpers/inline-functions.mjs';

async function loadBrowserModule(file, name) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await readFile(resolve(process.cwd(), file), 'utf8'), context);
  return context.window[name];
}

const profileRules = await loadBrowserModule('js/core/profile-utils.js', 'TREINO_PROFILES');
const streakRules = await loadBrowserModule('js/core/streak-utils.js', 'TREINO_STREAK');
const aiPlan = (await loadBrowserModule('js/core/ai-plan.js', 'TREINO_AI_PLAN')).create({
  DAY_ORDER: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']
});

it('preserva datas de conquista após oscilação sem modificar a meta original', () => {
  const original = { startWeight: 100, targetWeight: 80, startedAt: '2026-01-01' };
  const first = profileRules.recordGoalCheckpoints(original, 90, '2026-09-10');
  expect(first.checkpoints).toEqual({ 25: '2026-09-10', 50: '2026-09-10' });
  const back = profileRules.recordGoalCheckpoints(first, 98, '2026-09-11');
  expect(back.checkpoints).toEqual(first.checkpoints);
  expect(profileRules.recordGoalCheckpoints(back, 80, '2026-09-20').checkpoints).toEqual({ 25: '2026-09-10', 50: '2026-09-10', 75: '2026-09-20', 100: '2026-09-20' });
  expect(original.checkpoints).toBeUndefined();
});

it('média móvel usa no máximo sete pesagens válidas sem alterar os dados', () => {
  const entries = [80, 82, 84, 86, 88, 90, 92, 94].map(weight => ({ weight }));
  const trend = profileRules.weightTrend(entries);
  expect(trend[0].trend).toBe(80);
  expect(trend[1].trend).toBe(81);
  expect(trend[6].trend).toBe(86);
  expect(trend[7].trend).toBe(88);
  expect(trend[7].trendCount).toBe(7);
  expect(entries[0]).toEqual({ weight: 80 });
  expect(profileRules.weightTrend([{ weight: -1 }, { weight: 'abc' }, { weight: '70' }])[0].trend).toBe(70);
});

it('calcula os checkpoints de peso e limita o progresso', () => {
  const goal = profileRules.goalProgress(100, 90, 80);
  expect(goal.percent).toBe(50);
  expect(goal.checkpoints.map(p => p.weight)).toEqual([95, 90, 85, 80]);
  expect(goal.checkpoints.map(p => p.reached)).toEqual([true, true, false, false]);
  expect(profileRules.goalProgress(100, 105, 80).percent).toBe(0);
  expect(profileRules.goalProgress(100, 75, 80).percent).toBe(100);
  expect(profileRules.goalProgress(60, 65, 80).percent).toBe(25);
  expect(profileRules.goalProgress(80, 85, 80).percent).toBe(0);
  expect(profileRules.goalProgress(80, 80, 80).checkpoints).toEqual([]);
});

it.each(['height', 'weight', 'targetWeight', 'bodyFatPercent'])('valida números do perfil: %s', field => {
  for (const value of ['-1', '0', 'NaN', 'Infinity', 'abc', ' ']) {
    expect(profileRules.numericError(field, value)).not.toBe('');
  }
  for (const value of ['', '25', '25.5']) expect(profileRules.numericError(field, value)).toBe('');
  if (field === 'bodyFatPercent') {
    expect(profileRules.numericError(field, '100')).not.toBe('');
    expect(profileRules.numericError(field, '101')).not.toBe('');
  }
});

const logic = loadInlineFunctions([
  'formatLocalDateKey',
  'getMondayOf',
  'getEntrySeries',
  'describeEntry',
  'sessionVolume',
  'metDaForca',
  'normalizeExerciseName'
], {
  sessionHistory: (await loadBrowserModule('js/core/session-history.js', 'TREINO_SESSION_HISTORY')).create({}),
  DAY_ORDER: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
  IMPORT_TIPOS: ['forca', 'tempo', 'cardio'],
  MET_FORCA: 5.0
  , TREINO_DATE: {
    formatLocalDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; },
    getMondayOf(dateStr) { const d = new Date(dateStr + 'T12:00:00'); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d; }
  }
  , TREINO_CALORIES: {
    strengthMet(exercises, weight, minutes, getSeries, defaultMet) {
      let sets = 0, reps = 0, volume = 0; exercises.forEach(e => getSeries(e).forEach(s => { const r = +s.reps || 0, load = +s.weight || 0; sets++; reps += r; volume += r * load; }));
      if (!sets) return defaultMet; return Math.max(4.2, Math.min(6, 4.1 + Math.min(1.4, Math.max(0, volume / reps / weight) * 1.25) + Math.min(.5, (sets / minutes) * 2)));
    }
  }
});

describe('regras centrais do treino', () => {
  it('usa a data local em vez de converter para UTC', () => {
    expect(logic.formatLocalDateKey(new Date(2026, 8, 19, 0, 5))).toBe('2026-09-19');
  });

  it('agrupa domingos na segunda-feira anterior', () => {
    expect(logic.formatLocalDateKey(logic.getMondayOf('2026-09-20'))).toBe('2026-09-14');
    expect(logic.formatLocalDateKey(logic.getMondayOf('2026-09-16'))).toBe('2026-09-14');
  });

  it('descreve e soma séries com cargas diferentes corretamente', () => {
    const entry = { series: [{ reps: 12, weight: 40 }, { reps: 10, weight: 45 }, { reps: 8, weight: 45 }] };
    expect(logic.describeEntry(entry)).toBe('12/10/8 · 45-40kg');
    expect(logic.sessionVolume(entry)).toBe(1290);
  });

  it('mantém compatibilidade com o formato antigo de séries', () => {
    const entry = { sets: 3, reps: 10, weight: 40 };
    expect(logic.getEntrySeries(entry)).toEqual([
      { reps: 10, weight: 40 },
      { reps: 10, weight: 40 },
      { reps: 10, weight: 40 }
    ]);
    expect(logic.describeEntry(entry)).toBe('3x10 · 40kg');
  });

  it('normaliza acentos e espaços ao comparar exercícios entre planos', () => {
    expect(logic.normalizeExerciseName('  Puxada   Frontal  ')).toBe('puxada frontal');
    expect(logic.normalizeExerciseName('Elevação Lateral')).toBe('elevacao lateral');
  });

  it('escolhe o maior bloco válido quando a resposta da IA contém exemplos', () => {
    const plano = aiPlan.parsePlanoDaIA(`
      [PLANO]
      DIA|SEG|Exemplo||
      EX|Rosca|forca|2|10|0|
      [FIM]
      [PLANO]
      DIA|SEG|Peito|Hipertrofia|
      EX|Supino Reto|forca|3|10|40|
      EX|Crucifixo|forca|3|12|12|
      DIA|TER|Costas||
      EX|Puxada Frontal|forca|3|12|35|
      [FIM]
    `);
    expect(plano.dias).toHaveLength(2);
    expect(plano.dias[0].exercicios).toHaveLength(2);
    expect(plano.dias[1].exercicios[0].nome).toBe('Puxada Frontal');
  });

  it('aceita marcadores previsíveis com dois-pontos e hífen', () => {
    const plano = aiPlan.parsePlanoDaIA(`
      [PLANO]
      DIA: SEG|Peito|Hipertrofia|
      EX - Supino Inclinado|forca|3|10|30|
      [FIM]
    `);
    expect(plano.dias).toHaveLength(1);
    expect(plano.dias[0].dia).toBe('SEG');
    expect(plano.dias[0].exercicios[0].nome).toBe('Supino Inclinado');
  });

  it('estima maior intensidade para carga relativamente mais alta', () => {
    const leve = [{ type: 'forca', series: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }, { reps: 12, weight: 20 }] }];
    const pesado = [{ type: 'forca', series: [{ reps: 3, weight: 80 }, { reps: 3, weight: 80 }, { reps: 3, weight: 80 }, { reps: 3, weight: 80 }, { reps: 3, weight: 80 }] }];
    expect(logic.metDaForca(pesado, 80, 30)).toBeGreaterThan(logic.metDaForca(leve, 80, 30));
  });

  it('mantém o MET de força em uma faixa conservadora', () => {
    const extremo = [{ type: 'forca', series: [{ reps: 1, weight: 1000 }] }];
    expect(logic.metDaForca(extremo, 50, 1)).toBeLessThanOrEqual(6);
    expect(logic.metDaForca([], 80, 30)).toBe(5);
  });

  it('considera dias opcionais como descanso planejado', () => {
    const profile = { schedule: { DOM: { optional: true, exercises: [{ id: 'x' }] } } };
    expect(profileRules.isRestDay(profile, new Date('2026-09-20T12:00:00'), ['DOM'])).toBe(true);
  });

  it('mantém sequência através de descanso e a interrompe em treino perdido', () => {
    const checkins = { '2026-09-18': 'SEG', '2026-09-16': 'SEG' };
    const rest = date => date.getDay() === 4; // quinta
    const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(streakRules.calculate({ checkins, isRestDay: rest, formatDateKey: key, now: new Date('2026-09-18T12:00:00') })).toBe(2);
  });
});
