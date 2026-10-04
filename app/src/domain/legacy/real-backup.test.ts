import { expect, test } from 'vitest';
import { readBackup } from '../backup';
import { describeEntry, workoutCalories } from '../workouts';
import { trainingDaysPerWeek } from '../model';
// Backup exportado pelo próprio app 2.21.1: cadastro, 1 série do 1º exercício, o 2º exercício
// concluído pelo botão redondo e "Finalizar assim". Dados fictícios.
import realBackup from './real-backup-2.21.1.json?raw';

test('backup real do app 2.21.1 é convertido sem perdas', async () => {
  const result = await readBackup(realBackup);
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') return;
  const { data, report } = result;
  expect(report).toMatchObject({ workouts: 1, entries: 2, aggregatedEntries: 0, skippedEntries: 0, rejectedKeys: [] });

  const [workout] = data.workouts;
  expect(workout).toMatchObject({ planId: 'default', dayKey: 'DOM', dayName: 'Domingo: Extra (Opcional)' });
  expect(workout!.entries.map(describeEntry)).toEqual(['1x12 · 15kg', '3x12 · 8kg']);
  expect(workoutCalories(workout!, data.profile.weightKg!, data.settings.restSeconds)).not.toBeNull();

  expect(data.profile).toMatchObject({ name: 'Pessoa Teste', heightCm: 175, weightKg: 80 });
  expect(data.profile.weighIns).toHaveLength(1);
  const plan = data.plans[data.activePlanId!]!;
  expect(plan.name).toBe('PPL Hipertrofia e Emagrecimento');
  expect(Object.values(plan.days).reduce((n, d) => n + d.exercises.length, 0)).toBeGreaterThan(20);
  // o plano padrão tem 6 dias obrigatórios e o domingo opcional — o aviso O3 some
  expect(trainingDaysPerWeek(plan)).toBe(6);
  expect(data.checkins[workout!.date]).toEqual({ dayKey: 'DOM' });
  expect(data.gamification.totalXP).toBeGreaterThan(0);
});
