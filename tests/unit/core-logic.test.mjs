import { describe, expect, it } from 'vitest';
import { loadInlineFunctions } from '../helpers/inline-functions.mjs';

const logic = loadInlineFunctions([
  'formatLocalDateKey',
  'getMondayOf',
  'getEntrySeries',
  'describeEntry',
  'sessionVolume',
  'normalizeExerciseName',
  'extrairBlocosDoPlano',
  'parseBlocoDoPlano',
  'parsePlanoDaIA'
], {
  DAY_ORDER: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
  IMPORT_TIPOS: ['forca', 'tempo', 'cardio']
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
});
