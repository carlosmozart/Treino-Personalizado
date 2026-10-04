import { describe, expect, test } from 'vitest';
import { LEGACY_FIXTURE } from './fixture';
import { isLegacyBackupEnvelope, parseLegacyData } from './validate';
import { migrateLegacy } from './migrate';
import { trainingDaysPerWeek } from '../model';
// Validador do app atual: o conjunto de teste precisa ser aceito por ele para valer como real.
import legacyValidatorSource from '../../../../js/core/backup-validation.js?raw';

interface LegacyValidator {
  isValidData(data: object, allowedKeys: string[], jsonKeys: Set<string>): boolean;
}

function legacyValidator(): LegacyValidator {
  const window: { TREINO_BACKUP_VALIDATION?: LegacyValidator } = {};
  new Function('window', legacyValidatorSource)(window);
  return window.TREINO_BACKUP_VALIDATION!;
}

const NOW = new Date(2026, 9, 4, 12);
const migrate = (raw: Record<string, unknown>) => migrateLegacy(parseLegacyData(raw), NOW);

describe('conjunto de teste', () => {
  test('é aceito pelo validador do app atual', () => {
    const keys = Object.keys(LEGACY_FIXTURE);
    const json = new Set(keys.filter(k => LEGACY_FIXTURE[k]!.startsWith('{')));
    expect(legacyValidator().isValidData(LEGACY_FIXTURE, keys, json)).toBe(true);
    expect(parseLegacyData(LEGACY_FIXTURE).rejected).toEqual([]);
  });
});

describe('treinos', () => {
  const { data, report } = migrate(LEGACY_FIXTURE);
  const byDate = (date: string) => data.workouts.find(w => w.date === date)!;

  test('um treino por dia, em ordem de data, com id estável', () => {
    expect(data.workouts.map(w => w.date)).toEqual([
      '2026-09-05', '2026-09-07', '2026-09-14', '2026-09-15', '2026-09-17', '2026-09-21', '2026-09-28'
    ]);
    expect(byDate('2026-09-14').id).toBe('m-2026-09-14');
    expect(data.workouts.every(w => w.source === 'migrated')).toBe(true);
  });

  test('séries por série são preservadas; formato antigo vira séries iguais marcadas', () => {
    const old = byDate('2026-09-07').entries[0]!;
    expect(old.sets).toHaveLength(3);
    expect(old.sets.every(s => s.reps === 10 && s.weight === 40 && s.kind === 'work')).toBe(true);
    expect(old.aggregated).toBe(true);
    const pyramid = byDate('2026-09-14').entries[0]!;
    expect(pyramid.sets.map(s => s.weight)).toEqual([40, 45, 50]);
    expect(pyramid.aggregated).toBeUndefined();
    expect(pyramid.note).toBe('pegada fechada');
  });

  test('números gravados como texto viram números; ordem segue o plano', () => {
    const day = byDate('2026-09-14');
    expect(day.entries.map(e => e.name)).toEqual(['Supino Reto (Barra)', 'Elevação Lateral (Halteres)']);
    expect(day.entries[1]!.sets[0]).toEqual({ reps: 12, weight: 8, kind: 'work' });
  });

  test('plano, dia, duração e horários vêm do check-in e do registro de tempo', () => {
    expect(byDate('2026-09-14')).toMatchObject({
      planId: 'default', dayKey: 'SEG', dayName: 'Segunda: Push', durationMin: 61,
      startedAt: '2026-09-14T12:01:00.000Z', endedAt: '2026-09-14T13:02:00.000Z'
    });
    // check-in antigo sem dia (true): o dia vem do plano onde o exercício está
    expect(byDate('2026-09-28')).toMatchObject({ planId: 'casa', dayKey: 'SEG' });
  });

  test('alternativa e troca avulsa entram com o próprio nome', () => {
    expect(byDate('2026-09-21').entries.map(e => [e.name, e.key])).toEqual([
      ['Supino com Halteres', 'supino com halteres'], ['Crucifixo Máquina', 'crucifixo maquina']
    ]);
  });

  test('mesmo exercício em planos diferentes compartilha a identidade pelo nome', () => {
    const keys = data.workouts.flatMap(w => w.entries).filter(e => e.name.toLowerCase().startsWith('supino reto')).map(e => e.key);
    expect(new Set(keys)).toEqual(new Set(['supino reto (barra)']));
  });

  test('cardio guarda minutos e distância', () => {
    expect(byDate('2026-09-17').entries[0]).toMatchObject({ mode: 'cardio', sets: [], cardio: { minutes: 25, km: 3 } });
  });

  test('dia só no histórico de último registro entra; repetido não duplica', () => {
    expect(byDate('2026-09-05').entries[0]).toMatchObject({ name: 'Agachamento Livre', aggregated: true });
    expect(byDate('2026-09-14').entries.filter(e => e.key === 'supino reto (barra)')).toHaveLength(1);
  });

  test('relatório conta o que veio e o que foi descartado', () => {
    expect(report).toMatchObject({
      plans: 2, workouts: 7, entries: 9, aggregatedEntries: 2, checkins: 8, weighIns: 2, skippedEntries: 2, rejectedKeys: []
    });
  });
});

describe('demais dados', () => {
  const { data } = migrate(LEGACY_FIXTURE);

  test('perfil com números convertidos e uma pesagem por dia', () => {
    expect(data.profile).toMatchObject({
      name: 'Pessoa Teste', sex: 'masculino', heightCm: 175, weightKg: 80, targetWeightKg: 75, bodyFatPercent: null,
      weighIns: [{ date: '2026-08-01', weight: 84 }, { date: '2026-09-01', weight: 81.5 }]
    });
    expect(data.profile.weightGoal).toEqual({
      startWeight: 84, targetWeight: 75, startedAt: '2026-08-01', checkpoints: { 25: '2026-08-20', 50: '2026-09-25' }
    });
  });

  test('alvo sem meta gravada vira meta a partir da primeira pesagem, com marcos pelo histórico', () => {
    const raw = structuredClone(LEGACY_FIXTURE) as Record<string, unknown>;
    const profile = JSON.parse(raw.treino_user_profile as string) as Record<string, unknown>;
    delete profile.weightGoal;
    profile.targetWeight = '80';
    profile.weightHistory = [{ date: '2026-08-16', weight: 100 }, { date: '2026-09-07', weight: 95 }, { date: '2026-09-29', weight: 94.2 }];
    raw.treino_user_profile = JSON.stringify(profile);
    expect(migrate(raw).data.profile.weightGoal).toEqual({
      startWeight: 100, targetWeight: 80, startedAt: '2026-08-16', checkpoints: { 25: '2026-09-07' }
    });
  });

  test('planos com metas numéricas, alternativas e dias por semana calculados', () => {
    const ppl = data.plans.default!;
    expect(ppl.days.SEG.exercises[0]!.alternatives).toEqual([{ name: 'Supino com Halteres', mode: 'reps' }]);
    expect(ppl.days.SEG.exercises[0]!.tip).toBe('Sem banco livre? Use o Supino Máquina.');
    expect(ppl.days.SEG.exercises[1]).toMatchObject({ sets: 3, reps: 12, weight: 8, restSeconds: 60 });
    expect(ppl.days.QUI.exercises[0]).toMatchObject({ mode: 'cardio', minutes: 20, km: 2, optional: true });
    expect(ppl.days.DOM.optional).toBe(true);
    expect(trainingDaysPerWeek(ppl)).toBe(5); // SEG, TER, QUI, SEX, SAB (QUA vazio, DOM opcional)
    expect(data.activePlanId).toBe('default');
  });

  test('check-ins, água, configurações, gamificação e metadados', () => {
    expect(data.checkins['2026-09-28']).toEqual({ dayKey: null });
    expect(data.checkins['2026-09-30']).toEqual({ dayKey: 'QUA' });
    expect(data.water).toEqual({ '2026-09-14': 2500, '2026-09-15': 1800 });
    expect(data.settings).toMatchObject({ restSeconds: 75, restSound: false, trainingReminders: true, restAutoStart: true });
    expect(data.gamification).toMatchObject({
      totalXP: 450, longestStreak: 5, checkinXP: { '2026-09-15': { amount: 50, full: false } },
      achievements: { first_checkin: '2026-09-05' }, activatedPlans: { default: true, casa: true }
    });
    expect(data.meta).toEqual({ hintsSeen: { swipe: true }, lastSeenVersion: '2.21.1', lastBackupAt: '2026-09-20T10:00:00.000Z' });
  });
});

describe('robustez', () => {
  test('chave estragada é ignorada sem impedir as demais', () => {
    const { data, report } = migrate({ ...LEGACY_FIXTURE, treino_water_log: '{quebrado', treino_xyz: '{}' });
    expect(report.rejectedKeys).toEqual([
      { key: 'treino_water_log', reason: 'JSON inválido' }, { key: 'treino_xyz', reason: 'chave desconhecida' }
    ]);
    expect(data.water).toEqual({});
    expect(data.workouts).toHaveLength(7);
  });

  test('recusa propriedades perigosas', () => {
    const { report } = migrate({ ...LEGACY_FIXTURE, treino_settings: '{"__proto__":{"x":1}}' });
    expect(report.rejectedKeys).toEqual([{ key: 'treino_settings', reason: 'estrutura inválida' }]);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  test('aparelho sem dados vira um app vazio válido', () => {
    const { data, report } = migrate({});
    expect(data.workouts).toEqual([]);
    expect(data.activePlanId).toBeNull();
    expect(report.workouts).toBe(0);
  });

  test('backup v1 exportado pelo app atual é reconhecido', () => {
    const backup = { app: 'treino-personalizado', backupVersion: 1, appVersion: '2.21.1', exportedAt: '2026-10-04T00:00:00Z', data: LEGACY_FIXTURE };
    expect(isLegacyBackupEnvelope(backup)).toBe(true);
    expect(migrate(backup.data).data).toEqual(migrate(LEGACY_FIXTURE).data);
    expect(isLegacyBackupEnvelope({ ...backup, backupVersion: 2 })).toBe(false);
  });
});
