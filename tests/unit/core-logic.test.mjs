import { describe, expect, it } from 'vitest';
import { loadInlineFunctions } from '../helpers/inline-functions.mjs';

const logic = loadInlineFunctions([
  'formatLocalDateKey',
  'getMondayOf',
  'getEntrySeries',
  'describeEntry',
  'sessionVolume',
  'metDaForca',
  'normalizeExerciseName',
  'extrairBlocosDoPlano',
  'parseBlocoDoPlano',
  'parsePlanoDaIA'
], {
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
    const plano = logic.parsePlanoDaIA(`
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
    const plano = logic.parsePlanoDaIA(`
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
});
