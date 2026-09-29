import { expect, test, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
for (const path of ['level-utils', 'rewards']) {
  vm.runInContext(await readFile(new URL('../../js/core/' + path + '.js', import.meta.url), 'utf8'), context);
}
function setup() {
  const state = {
    game: { totalXP: 0, checkins: {}, streakBonuses: {}, freeMealRewards: {}, waterBonus: {} },
    checkins: {}, profile: { daysPerWeek: 6 }, profileId: 'a',
    user: { weight: 70, activityLevel: 'moderado', birthdate: '1990-09-28' },
    water: {}, streak: 0, date: new Date(2026, 8, 28, 12)
  };
  const saveJSON = vi.fn(), renderLevelBar = vi.fn(), showToast = vi.fn(), checkAchievements = vi.fn();
  const rewards = context.window.TREINO_REWARDS.create({
    getGamification: () => state.game, getCheckins: () => state.checkins,
    getActiveProfile: () => state.profile, getActiveProfileId: () => state.profileId,
    getUserProfile: () => state.user, getWaterLog: () => state.water,
    getLevelInfo: xp => context.window.TREINO_LEVELS.getLevelInfo(xp, 100),
    saveJSON, GAMIFICATION_KEY: 'game', renderLevelBar, showToast,
    getFullCheckinXP: () => 100, getHalfCheckinXP: () => 50,
    getStreakBonusXP: () => 30, getWaterBonusXP: () => 10,
    calculateStreak: () => state.streak, checkAchievements,
    formatLocalDateKey: d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'),
    getMondayOfCurrentWeek: () => new Date(2026, 8, 28),
    FREE_MEAL_THRESHOLD_PCT: .8, todayKey: () => '2026-09-28',
    computeWaterTargetMl: weight => weight > 0 ? 2500 : 0, now: () => state.date
  });
  return { state, rewards, saveJSON, renderLevelBar, showToast, checkAchievements };
}

test('check-in parcial repetido, promoção, repetição cheia e revogação são idempotentes', () => {
  const { state, rewards } = setup();
  rewards.grantCheckinXP('2026-09-28', false);
  rewards.grantCheckinXP('2026-09-28', false);
  expect(state.game.totalXP).toBe(50);
  rewards.grantCheckinXP('2026-09-28', true);
  rewards.grantCheckinXP('2026-09-28', true);
  rewards.grantCheckinXP('2026-09-28', false);
  expect(state.game.totalXP).toBe(100);
  expect(state.game.checkins['2026-09-28']).toEqual({ amount: 100, full: true });
  rewards.revokeCheckinXP('2026-09-28');
  rewards.revokeCheckinXP('2026-09-28');
  expect(state.game.totalXP).toBe(0);
  expect(state.game.checkins).toEqual({});
});

test('XP usa estado substituído, avisa mudança de nível e nunca fica negativo', () => {
  const s = setup(), old = s.state.game;
  s.state.game = { ...old, totalXP: 90 };
  s.rewards.grantXP(10);
  expect(old.totalXP).toBe(0);
  expect(s.state.game.totalXP).toBe(100);
  expect(s.showToast).toHaveBeenCalledWith('🎉 Nível 2 alcançado!', 'trophy');
  s.rewards.revokeXP(500);
  expect(s.state.game.totalXP).toBe(0);
  s.rewards.grantXP(0);
  s.rewards.revokeXP(-1);
  expect(s.renderLevelBar).toHaveBeenCalledTimes(2);
});

test.each([[6, true], [7, false], [20, false], [21, true]])('check-in às %sh preserva limite noturno', (hour, expected) => {
  const s = setup();
  s.state.date.setHours(hour);
  s.rewards.grantCheckinXP('2026-09-28', true);
  expect(Boolean(s.state.game.nightCheckins?.['2026-09-28'])).toBe(expected);
});

test('sequência concede um bônus por ciclo e perfil', () => {
  const s = setup();
  s.state.streak = 5;
  s.rewards.checkStreakBonus();
  expect(s.state.game.totalXP).toBe(0);
  s.state.streak = 6;
  s.rewards.checkStreakBonus();
  s.rewards.checkStreakBonus();
  expect(s.state.game.totalXP).toBe(30);
  s.state.streak = 12;
  s.rewards.checkStreakBonus();
  s.state.profileId = 'b';
  s.rewards.checkStreakBonus();
  expect(s.state.game.totalXP).toBe(90);
  expect(s.state.game.streakBonuses).toEqual({ a_1: true, a_2: true, b_2: true });
});

test('refeição exige 80% arredondados para cima e conta somente segunda a domingo', () => {
  const s = setup();
  s.state.checkins = Object.fromEntries(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-05'].map(d => [d, true]));
  expect(s.rewards.calculateWeeklyCheckinCount()).toBe(4);
  s.rewards.checkFreeMealReward();
  expect(s.showToast).not.toHaveBeenCalled();
  s.state.checkins['2026-10-04'] = true;
  s.rewards.checkFreeMealReward();
  s.rewards.checkFreeMealReward();
  expect(s.state.game.freeMealRewards).toEqual({ '2026-09-28': true });
  expect(s.showToast).toHaveBeenCalledTimes(1);
});

test('meta de água concede bônus uma vez, apenas com meta válida atingida', () => {
  const s = setup();
  s.state.water['2026-09-28'] = 2499;
  s.rewards.checkWaterBonus();
  expect(s.state.game.totalXP).toBe(0);
  s.state.water['2026-09-28'] = 2500;
  s.rewards.checkWaterBonus();
  s.rewards.checkWaterBonus();
  expect(s.state.game.totalXP).toBe(10);
  expect(s.checkAchievements).toHaveBeenCalledTimes(1);
  s.state.game.waterBonus = {};
  s.state.user.weight = 0;
  s.rewards.checkWaterBonus();
  expect(s.state.game.totalXP).toBe(10);
});

test('aniversário é saudado apenas no dia e uma vez por ano', () => {
  const s = setup();
  s.state.date.setDate(27);
  s.rewards.checkBirthday();
  expect(s.showToast).not.toHaveBeenCalled();
  s.state.date.setDate(28);
  s.rewards.checkBirthday();
  s.rewards.checkBirthday();
  expect(s.showToast).toHaveBeenCalledTimes(1);
  expect(s.state.game.birthdayGreeted).toEqual({ 2026: true });
  s.state.date.setFullYear(2027);
  s.rewards.checkBirthday();
  expect(s.showToast).toHaveBeenCalledTimes(2);
});
