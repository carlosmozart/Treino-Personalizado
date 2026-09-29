import { expect, test, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
for (const path of ['data/achievements.js', 'js/ui/achievements.js']) {
  vm.runInContext(await readFile(new URL('../../' + path, import.meta.url), 'utf8'), context);
}

function setup() {
  let state = { checkins: {}, profile: {}, game: { totalXP: 0, unlockedAchievements: {} }, volume: 0 };
  const catalog = context.window.TREINO_ACHIEVEMENTS.create({
    getCheckins: () => state.checkins, getProfile: () => state.profile,
    getGamification: () => state.game, getLevelInfo: xp => ({ level: xp / 100 }),
    getTotalVolume: () => state.volume
  });
  const nodes = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { classList: { toggle: vi.fn() } });
    return nodes.get(id);
  } };
  const saveJSON = vi.fn(), showToast = vi.fn();
  const ui = context.window.TREINO_ACHIEVEMENTS_UI.create({
    document, ACHIEVEMENTS: catalog, getGamification: () => state.game,
    saveJSON, GAMIFICATION_KEY: 'game', todayKey: () => '2026-09-28',
    showToast, conquistasView: { classList: { contains: () => false } },
    formatDateBR: value => value
  });
  return { catalog, ui, nodes, saveJSON, showToast,
    get state() { return state; }, replace(value) { state = value; } };
}

test('preserva catálogo, limiares e consulta estado substituído após restauração', () => {
  const s = setup();
  expect(s.catalog).toHaveLength(28);
  expect(new Set(s.catalog.map(a => a.id)).size).toBe(28);
  expect(s.catalog.find(a => a.id === 'volume_1m').target).toBe(1000000);
  expect(s.catalog.find(a => a.id === 'primeiro_checkin').current()).toBe(0);
  s.replace({ checkins: { '2026-05-04': true }, profile: { weightHistory: [1, 2, 3, 4, 5] },
    game: { totalXP: 8000, longestStreak: 14, unlockedAchievements: {} }, volume: 30000 });
  for (const [id, value] of [['primeiro_checkin', 1], ['star_wars_day', 1],
    ['peso_5x', 5], ['xp_8000', 8000], ['streak_14', 14], ['volume_30k', 30000]]) {
    expect(s.catalog.find(a => a.id === id).current()).toBe(value);
  }
});

test('desbloqueia uma única vez e preserva conquista após regressão', () => {
  const s = setup();
  s.ui.checkAchievements();
  expect(s.saveJSON).not.toHaveBeenCalled();
  s.state.checkins['2026-09-28'] = true;
  s.ui.checkAchievements();
  expect(s.state.game.unlockedAchievements.primeiro_checkin).toBe('2026-09-28');
  expect(s.saveJSON).toHaveBeenCalledTimes(1);
  expect(s.showToast).toHaveBeenCalledTimes(1);
  s.state.checkins = {};
  s.ui.checkAchievements();
  expect(s.saveJSON).toHaveBeenCalledTimes(1);
  expect(s.showToast).toHaveBeenCalledTimes(1);
  expect(s.state.game.unlockedAchievements.primeiro_checkin).toBe('2026-09-28');
});

test('filtros mostram desbloqueadas, bloqueadas e estado vazio', () => {
  const s = setup();
  s.ui.setAchievementsFilter('desbloqueadas');
  expect(s.nodes.get('achievementsList').innerHTML).toBe('');
  expect(s.nodes.get('achievementsEmptyState').classList.toggle).toHaveBeenLastCalledWith('hidden', false);
  s.state.checkins['2026-09-28'] = true;
  s.ui.checkAchievements();
  expect(s.nodes.get('achievementsCount').textContent).toBe('1/28');
  expect(s.nodes.get('achievementsList').innerHTML).toContain('Primeiro Passo');
  expect(s.nodes.get('achievementsList').innerHTML).not.toContain('Ganhando Ritmo');
  s.ui.setAchievementsFilter('bloqueadas');
  expect(s.nodes.get('achievementsList').innerHTML).not.toContain('Primeiro Passo');
  expect(s.nodes.get('achievementsList').innerHTML).toContain('Ganhando Ritmo');
});
