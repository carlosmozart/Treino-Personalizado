import { expect, test } from 'vitest';
import { recommendPlan, type SetupAnswers } from './onboarding';
import { PLAN_TEMPLATES } from '../data/plan-templates';

const base: SetupAnswers = { goal: 'massa', days: 3, place: 'academia', level: 'intermediario', schedule: 'fixo' };
const r = (p: Partial<SetupAnswers>) => recommendPlan({ ...base, ...p });

test('primeira abertura escolhe um modelo que existe', () => {
  const ids = new Set(PLAN_TEMPLATES.map(t => t.id));
  for (const goal of ['massa', 'forca', 'emagrecer', 'saude'] as const)
    for (const days of [2, 3, 4, 5, 6])
      for (const place of ['academia', 'casa'] as const)
        for (const level of ['iniciante', 'intermediario', 'avancado'] as const)
          expect(ids.has(r({ goal, days, place, level }).templateId)).toBe(true);
});

test('regras principais', () => {
  expect(r({ place: 'casa' }).templateId).toBe('em-casa');
  expect(r({ level: 'iniciante', days: 5 })).toMatchObject({ templateId: 'corpo-inteiro', linear: true });
  expect(r({ goal: 'forca' })).toMatchObject({ templateId: 'forca-5x5', linear: true });
  expect(r({ days: 3 }).templateId).toBe('abc');
  expect(r({ days: 4 }).templateId).toBe('superior-inferior');
  expect(r({ days: 6, level: 'avancado' }).templateId).toBe('ppl');
  expect(r({ days: 6, level: 'intermediario' }).templateId).toBe('superior-inferior');
  expect(r({ schedule: 'flexivel' }).rotation).toBe(true);
  expect(r({}).linear).toBe(false);
});
