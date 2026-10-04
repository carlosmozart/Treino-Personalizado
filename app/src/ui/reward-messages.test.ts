import { expect, test } from 'vitest';
import { rewardToast } from './reward-messages';

test('avisos de recompensa em português; XP de água/bônus não duplica o aviso do próprio bônus', () => {
  expect(rewardToast({ kind: 'record', name: 'Supino', reps: 8, weight: 42.5, records: ['e1rm'], e1rm: 53.8 })).toEqual({ text: 'Recorde em Supino: 1RM estimado 53,8 kg (42,5 kg × 8)', tone: 'trophy' });
  expect(rewardToast({ kind: 'record', name: 'Supino', reps: 1, weight: 60, records: ['weight'], e1rm: 60 })?.text).toBe('Recorde de carga em Supino: 60 kg × 1');
  expect(rewardToast({ kind: 'record', name: 'Supino', reps: 10, weight: 40, records: ['volume'], e1rm: 53.3 })?.text).toBe('Recorde de volume em Supino');
  expect(rewardToast({ kind: 'level-up', level: 3 })?.text).toBe('Nível 3 alcançado!');
  expect(rewardToast({ kind: 'xp', amount: 50, reason: 'checkin-half' })?.text).toContain('meio');
  expect(rewardToast({ kind: 'xp', amount: 10, reason: 'water' })).toBeNull();
  expect(rewardToast({ kind: 'birthday', name: '' })?.text).toMatch(/^Feliz aniversário!/);
});
