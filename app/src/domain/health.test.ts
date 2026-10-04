import { expect, test } from 'vitest';
import {
  TMB_FORMULAS, bmi, classifyBmi, idealWeightRange, tdee, tmbHarrisBenedict, tmbKatchMcArdle,
  tmbMifflin, waterTargetMl
} from './health';
import { cardioMet, kcal, strengthMet } from './calories';

test('preserva as três fórmulas metabólicas e multiplicadores', () => {
  expect(tmbMifflin(70, 175, 30, 'masculino')).toBe(1648.75);
  expect(tmbMifflin(70, 175, 30, 'feminino')).toBe(1482.75);
  expect(tmbHarrisBenedict(70, 175, 30, 'masculino')).toBeCloseTo(1695.667);
  expect(tmbKatchMcArdle(80, 20)).toBeCloseTo(1752.4);
  expect(tmbKatchMcArdle(80, 80)).toBeNull();
  expect(tmbKatchMcArdle(80, null)).toBeNull();
  expect(tmbMifflin(0, 175, 30, '')).toBeNull();
  expect(tmbMifflin(70, 175, null, '')).toBeNull();
  expect(tdee(1000, 'moderado')).toBe(1550);
  expect(tdee(1000, 'intenso')).toBe(1725);
  expect(tdee(1000, undefined)).toBe(1200);
  expect(tdee(null, 'moderado')).toBeNull();
  expect(TMB_FORMULAS.katch.compute({ weightKg: 80, heightCm: 175, age: 30, sex: '', bodyFatPercent: 20 })).toBeCloseTo(1752.4);
});

test('preserva IMC, classificações, faixa ideal e meta de água', () => {
  expect(bmi(70, 175)).toBeCloseTo(22.857);
  expect(bmi(70, 0)).toBeNull();
  expect([18, 18.5, 25, 30, 35].map(n => classifyBmi(n).label)).toEqual([
    'Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Obesidade grau I', 'Obesidade grau II/III'
  ]);
  expect(idealWeightRange(175)).toEqual({ min: 56.7, max: 76.3 });
  expect(waterTargetMl(80, 'moderado')).toBe(3150);
  expect(waterTargetMl(0, 'moderado')).toBe(0);
});

test('MET de força maior para carga relativa alta e sempre numa faixa conservadora', () => {
  const leve = Array.from({ length: 3 }, () => ({ reps: 12, weight: 20 }));
  const pesado = Array.from({ length: 5 }, () => ({ reps: 3, weight: 80 }));
  expect(strengthMet(pesado, 80, 30)).toBeGreaterThan(strengthMet(leve, 80, 30));
  expect(strengthMet([{ reps: 1, weight: 1000 }], 50, 1)).toBeLessThanOrEqual(6);
  expect(strengthMet([], 80, 30)).toBe(5);
});

test('MET do cardio pela velocidade e cálculo de kcal', () => {
  expect(cardioMet(60, 5)).toBe(3.5);
  expect(cardioMet(30, 4.5)).toBe(9.0); // 9 km/h
  expect(cardioMet(30, 5)).toBe(11.0); // 10 km/h
  expect(cardioMet(30, 0)).toBe(6.0);
  expect(kcal(6, 80, 30)).toBe(240);
});
