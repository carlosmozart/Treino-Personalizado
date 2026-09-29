import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/plan-management.js', import.meta.url), 'utf8'), context);
function setup() {
  let profiles = { original: { name: 'Plano', daysPerWeek: 1, schedule: {
    SEG: { name: 'Segunda', focus: 'Força', optional: true,
      exercises: [{ id: 'old', name: 'Supino', backups: [{ name: 'Flexão' }] }] }
  } } };
  let active = 'original', sequence = 0;
  const gamification = {};
  const deps = {
    document: { getElementById: () => ({ innerHTML: '' }) },
    getProfiles: () => profiles, getGamification: () => gamification,
    getActiveProfileId: () => active, setActiveProfileId: value => { active = value; },
    TREINO_PROFILES: { has: (items, id) => Object.hasOwn(items, id) }, DAY_ORDER: ['SEG'],
    PROFILES_KEY: 'profiles', ACTIVE_PROFILE_KEY: 'active', GAMIFICATION_KEY: 'gamification',
    saveJSON: vi.fn(), saveString: vi.fn(), renderWorkoutSelectOptions: vi.fn(),
    getTodaysWorkoutKey: () => 'SEG', workoutSelect: {}, initializeWorkoutData: vi.fn(),
    renderHeader: vi.fn(), renderExercises: vi.fn(), renderCheckinGrid: vi.fn(),
    renderLevelBar: vi.fn(), syncTrainingReminders: vi.fn(async () => {}),
    showToast: vi.fn(), switchView: vi.fn(), checkAchievements: vi.fn(),
    askConfirm: vi.fn(async () => true), escapeHtml: value => value,
    makeId: prefix => `${prefix}-${++sequence}`, todayKey: () => '2026-09-29'
  };
  return { api: context.window.TREINO_PLAN_MANAGEMENT.create(deps), deps, gamification,
    get profiles() { return profiles; }, set profiles(value) { profiles = value; },
    get active() { return active; } };
}
test('cópia mantém dias opcionais mas isola IDs e alternativas dos exercícios', async () => {
  const s = setup();
  await s.api.duplicateProfile('original');
  const copy = s.profiles['profile-1'];
  expect(copy.schedule.SEG.optional).toBe(true);
  expect(copy.schedule.SEG.exercises[0].id).not.toBe('old');
  copy.schedule.SEG.exercises[0].backups[0].name = 'Alterado';
  expect(s.profiles.original.schedule.SEG.exercises[0].backups[0].name).toBe('Flexão');
  expect(s.active).toBe('original');
  expect(s.deps.saveJSON).toHaveBeenCalledWith('profiles', s.profiles);
});
test('cancelar não duplica nem exclui; excluir plano ativo carrega o sobrevivente', async () => {
  const s = setup();
  s.deps.askConfirm.mockResolvedValueOnce(false);
  await s.api.duplicateProfile('original');
  expect(Object.keys(s.profiles)).toHaveLength(1);
  await s.api.deleteProfile('original');
  expect(s.profiles.original).toBeDefined();
  await s.api.duplicateProfile('original');
  s.deps.askConfirm.mockResolvedValueOnce(false);
  await s.api.deleteProfile('original');
  expect(s.profiles.original).toBeDefined();
  await s.api.deleteProfile('original');
  expect(s.active).toBe('profile-1');
  expect(s.profiles.original).toBeUndefined();
  expect(s.deps.initializeWorkoutData).toHaveBeenCalledWith('SEG');
});
test('seleção consulta planos restaurados e sincroniza treino, recompensas e lembretes', () => {
  const s = setup();
  s.profiles = { restored: s.profiles.original };
  s.api.selectProfile('original');
  expect(s.deps.saveString).not.toHaveBeenCalled();
  s.api.selectProfile('restored');
  expect(s.active).toBe('restored');
  expect(s.gamification.equippedProfiles.restored).toBe(true);
  expect(s.deps.workoutSelect.value).toBe('SEG');
  expect(s.deps.syncTrainingReminders).toHaveBeenCalledWith(false);
  expect(s.deps.switchView).toHaveBeenCalledWith('treino');
});
