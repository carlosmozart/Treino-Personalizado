import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/ai-plan.js', import.meta.url), 'utf8'), context);

test('prompt respeita exclusão de saúde e treino e lê dados atualizados ao reativar', () => {
  let profile = { weight: 80, height: 175 };
  const nodes = {};
  const node = id => nodes[id] ||= { value: '', classList: { toggle: vi.fn() }, setAttribute: vi.fn() };
  node('aiGoal').value = 'forca';
  const getActiveProfile = vi.fn(() => null);
  const buildWeeklyVolume = vi.fn(() => []);
  const api = context.window.TREINO_AI_PLAN_UI.create({
    document: { getElementById: node }, getUserProfile: () => profile,
    getActiveProfile, DAY_ORDER: ['SEG'], buildWeeklyVolume,
    calculateAge: () => null, computeIMC: () => null,
    TMB_FORMULAS: { mifflin: { compute: () => null } }, computeTDEE: () => null
  });
  node('aiDays').value = '3';
  expect(api.buildAIPrompt()).toContain('Peso atual: 80 kg');
  api.toggleAIOption('incluirSaude');
  api.toggleAIOption('incluirTreino');
  getActiveProfile.mockClear();
  buildWeeklyVolume.mockClear();
  const privatePrompt = api.buildAIPrompt();
  expect(privatePrompt).not.toContain('## SOBRE MIM');
  expect(privatePrompt).not.toContain('Peso atual');
  expect(getActiveProfile).not.toHaveBeenCalled();
  expect(buildWeeklyVolume).not.toHaveBeenCalled();
  profile = { weight: 72, height: 175 };
  api.toggleAIOption('incluirSaude');
  expect(node('aiPromptOutput').value).toContain('Peso atual: 72 kg');
});
