import { expect, test } from 'vitest';
import { rewardToast } from './reward-messages';

test('avisos de recompensa em português; XP de água/bônus não duplica o aviso do próprio bônus', () => {
  expect(rewardToast({ kind: 'record', name: 'Supino', reps: 8, weight: 42.5 })).toEqual({ text: 'Recorde em Supino: 42,5 kg × 8', tone: 'trophy' });
  expect(rewardToast({ kind: 'level-up', level: 3 })?.text).toBe('Nível 3 alcançado!');
  expect(rewardToast({ kind: 'xp', amount: 50, reason: 'checkin-half' })?.text).toContain('meio');
  expect(rewardToast({ kind: 'xp', amount: 10, reason: 'water' })).toBeNull();
  expect(rewardToast({ kind: 'birthday', name: '' })?.text).toMatch(/^Feliz aniversário!/);
});
