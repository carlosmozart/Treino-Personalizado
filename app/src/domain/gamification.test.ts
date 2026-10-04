import { expect, test } from 'vitest';
import {
  applyCheckinXP, bonusXP, freeMealThreshold, fullCheckinXP, halfCheckinXP, isBirthday,
  isNightCheckin, levelInfo, streakBonusKey, xpForLevel
} from './gamification';
import { calculateStreak } from './streak';
import { toDateKey } from './dates';

test('curva de níveis e nível máximo', () => {
  expect(xpForLevel(1)).toBe(100);
  expect(xpForLevel(2)).toBe(115);
  expect(levelInfo(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNext: 100, totalXP: 0 });
  expect(levelInfo(100)).toMatchObject({ level: 2, xpIntoLevel: 0, xpToNext: 115 });
  expect(levelInfo(214)).toMatchObject({ level: 2, xpIntoLevel: 114 });
  expect(levelInfo(10_000_000).level).toBe(100);
  expect(levelInfo(10_000_000).xpToNext).toBe(0);
});

test('XP de check-in divide o alvo semanal pelos dias do plano, com mínimo', () => {
  expect(fullCheckinXP(6)).toBe(100);
  expect(fullCheckinXP(3)).toBe(200);
  expect(fullCheckinXP(0)).toBe(100); // sem dias definidos, assume 6
  expect(fullCheckinXP(7, 100)).toBe(20); // nunca abaixo de 20
  expect(halfCheckinXP(100)).toBe(50);
  expect(bonusXP(100, 0.1)).toBe(10);
  expect(bonusXP(5, 0.1)).toBe(1);
});

test('check-in não concede em dobro e completa a diferença de meio para cheio', () => {
  const first = applyCheckinXP(undefined, false, 100);
  expect(first).toEqual({ record: { amount: 50, full: false }, gained: 50 });
  const upgrade = applyCheckinXP(first.record, true, 100);
  expect(upgrade).toEqual({ record: { amount: 100, full: true }, gained: 50 });
  expect(applyCheckinXP(upgrade.record, true, 100).gained).toBe(0);
  expect(applyCheckinXP(upgrade.record, false, 100)).toEqual({ record: upgrade.record, gained: 0 });
});

test('bônus de sequência por ciclo completo, refeição livre e datas especiais', () => {
  expect(streakBonusKey('ppl', 5, 6)).toBeNull();
  expect(streakBonusKey('ppl', 6, 6)).toBe('ppl_1');
  expect(streakBonusKey('ppl', 13, 6)).toBe('ppl_2');
  expect(freeMealThreshold(6)).toBe(5);
  expect(freeMealThreshold(3)).toBe(3);
  expect(isNightCheckin(new Date(2026, 9, 4, 21, 0))).toBe(true);
  expect(isNightCheckin(new Date(2026, 9, 4, 6, 59))).toBe(true);
  expect(isNightCheckin(new Date(2026, 9, 4, 7, 0))).toBe(false);
  expect(isBirthday('1995-10-04', new Date(2026, 9, 4))).toBe(true);
  expect(isBirthday('1995-10-05', new Date(2026, 9, 4))).toBe(false);
  expect(isBirthday('inválida', new Date(2026, 9, 4))).toBe(false);
});

test('sequência atravessa descanso planejado e para em treino perdido', () => {
  const checkins = new Set(['2026-09-18', '2026-09-16']);
  const streak = calculateStreak({
    isCheckedIn: key => checkins.has(key),
    isRestDay: date => date.getDay() === 4, // quinta
    now: new Date('2026-09-18T12:00:00')
  });
  expect(streak).toBe(2);
});

test('hoje sem check-in ainda não quebra a sequência', () => {
  const ontem = toDateKey(new Date(2026, 9, 3));
  expect(calculateStreak({
    isCheckedIn: key => key === ontem, isRestDay: () => false, now: new Date(2026, 9, 4, 10)
  })).toBe(1);
});
