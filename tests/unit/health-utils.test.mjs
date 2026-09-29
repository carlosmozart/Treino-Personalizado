import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/core/health-utils.js', import.meta.url), 'utf8'), context);
const health = context.window.TREINO_HEALTH;

test('preserva as três fórmulas metabólicas e multiplicadores', () => {
  expect(health.computeTMB_Mifflin(70, 175, 30, 'masculino')).toBe(1648.75);
  expect(health.computeTMB_Mifflin(70, 175, 30, 'feminino')).toBe(1482.75);
  expect(health.computeTMB_HarrisBenedict(70, 175, 30, 'masculino')).toBeCloseTo(1695.667);
  expect(health.computeTMB_KatchMcArdle(80, 20)).toBeCloseTo(1752.4);
  expect(health.computeTDEE(1000, 'moderado')).toBe(1550);
  expect(health.computeTDEE(1000, 'intenso')).toBe(1725);
  expect(health.computeTDEE(null, 'moderado')).toBeNull();
  expect(health.computeTMB_KatchMcArdle(80, '')).toBeNull();
  expect(health.computeTMB_Mifflin(0, 175, 30, '')).toBeNull();
  expect(health.TMB_FORMULAS.katch.compute(80, 175, 30, '', 20)).toBeCloseTo(1752.4);
});

test('preserva IMC, classificações e meta de água', () => {
  expect(health.computeIMC(70, 175)).toBeCloseTo(22.857);
  expect(health.computeIMC(70, 0)).toBeNull();
  expect([18, 18.5, 25, 30, 35].map(n => health.classifyIMC(n).label)).toEqual([
    'Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Obesidade grau I', 'Obesidade grau II/III'
  ]);
  expect(health.computeWaterTargetMl(80, 'moderado')).toBe(3150);
  expect(health.computeWaterTargetMl(0, 'moderado')).toBe(0);
  expect(health.computeIdealWeightRange(175)).toEqual({ min: '56.7', max: '76.3' });
});
