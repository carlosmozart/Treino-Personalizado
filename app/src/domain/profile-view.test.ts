import { expect, test } from 'vitest';
import { ageFrom, healthSummary, restoreBackup } from './profile-view';
import { sampleData } from './testing';

const NOW = new Date(2026, 9, 7, 9);

test('idade em anos completos', () => {
  expect(ageFrom('1990-10-07', NOW)).toBe(36);
  expect(ageFrom('1990-10-08', NOW)).toBe(35);
  expect(ageFrom('', NOW)).toBeNull();
});

test('saúde: IMC, faixa ideal, TMB, gasto e água; o que falta no cadastro', () => {
  const { profile } = sampleData();
  const full = healthSummary({ ...profile, heightCm: 180, birthdate: '1990-01-01', sex: 'masculino', activityLevel: 'moderado' }, NOW);
  expect(full.missing).toEqual([]);
  expect(full.bmi).toBeCloseTo(24.7, 1);
  expect(full.bmiClass?.label).toBe('Peso normal');
  expect(full.ideal).toEqual({ min: 59.9, max: 80.7 });
  expect(full.tmb).toBe(1750); // 800 + 1125 − 180 + 5
  expect(full.tdee).toBeGreaterThan(full.tmb!);
  expect(full.waterMl).toBe(3150);
  const empty = healthSummary({ ...profile, heightCm: null }, NOW);
  expect(empty.missing).toEqual(['altura', 'data de nascimento', 'sexo']);
  expect(empty.tmb).toBeNull();
});

test('restaurar backup carimba tudo para sincronizar', () => {
  const restored = sampleData();
  restored.sync.changed['plan:p1'] = '2020-01-01T00:00:00.000Z';
  const { data } = restoreBackup(sampleData(), restored, NOW);
  expect(data.sync.changed['plan:p1']).toBe(NOW.toISOString());
  expect(data.sync.changed.profile).toBe(NOW.toISOString());
});
