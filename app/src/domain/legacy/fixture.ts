// Dados no formato exato do app antigo (≤ 2.x), cobrindo os casos-limite de
// docs/dev/modelo-de-dados.md. Valores como texto onde os formulários antigos gravavam texto.

const day = (name: string, exercises: object[] = [], extra: object = {}) => ({ name, focus: '', exercises, ...extra });

const pplSchedule = {
  SEG: day('Segunda: Push', [
    { id: 'ex1', name: 'Supino Reto (Barra)', type: 'forca', targetSets: 3, targetReps: 10, targetWeight: 40,
      backups: [{ name: 'Supino com Halteres', type: 'forca' }, { name: '', type: 'forca' }] },
    { id: 'ex2', name: 'Elevação Lateral (Halteres)', type: 'forca', targetSets: '3', targetReps: '12', targetWeight: '8', restSeconds: 60 }
  ]),
  TER: day('Terça: Pull', [{ id: 'ex3', name: 'Puxada Frontal (Polia)', type: 'forca', targetSets: 3, targetReps: 12, targetWeight: 35 }]),
  QUA: day('Quarta: Descanso'),
  QUI: day('Quinta: Cardio', [{ id: 'ex4', name: 'Esteira', type: 'cardio', optional: true, targetDuration: 20, targetDistance: 2 }]),
  SEX: day('Sexta: Push B', [{ id: 'ex5', name: 'Supino reto (barra)', type: 'forca', targetSets: 4, targetReps: 8, targetWeight: 45 }]),
  SAB: day('Sábado: Legs', [{ id: 'ex6', name: 'Agachamento Livre', type: 'forca', targetSets: 4, targetReps: 8, targetWeight: 60 }]),
  DOM: day('Domingo: Extra (Opcional)', [{ id: 'ex7', name: 'Abdominal', type: 'forca', targetSets: 3, targetReps: 15, targetWeight: 0 }], { optional: true })
};

const emptySchedule = Object.fromEntries(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map(k => [k, day('')]));

const profiles = {
  default: { id: 'default', name: 'PPL', description: 'Plano padrão', daysPerWeek: 6, trainingTime: '12:00',
    schedule: pplSchedule, createdAt: '2026-01-05', updatedAt: '2026-09-01' },
  casa: { id: 'casa', name: 'Em casa', description: '', daysPerWeek: '3', trainingTime: '',
    schedule: { ...emptySchedule, SEG: day('Segunda: Casa', [{ id: 'c1', name: 'Supino Reto (Barra)', type: 'forca', targetSets: 3, targetReps: 10, targetWeight: 30 }]) },
    createdAt: '2026-08-01', updatedAt: '2026-08-01' }
};

const sessionLog = {
  // Formato antigo (≤ 2.10, sem séries) e novo (por série) no mesmo exercício.
  ex1: [
    { type: 'forca', name: 'Supino Reto (Barra)', sets: 3, reps: 10, weight: 40, date: '2026-09-07' },
    { type: 'forca', name: 'Supino Reto (Barra)', series: [{ reps: 12, weight: 40 }, { reps: 10, weight: 45 }, { reps: 8, weight: 50 }],
      sets: 3, reps: 12, weight: 40, date: '2026-09-14', obs: ' pegada fechada ' }
  ],
  ex2: [{ type: 'forca', name: 'Elevação Lateral (Halteres)', series: [{ reps: '12', weight: '8' }, { reps: '12', weight: '8' }], date: '2026-09-14' }],
  // Alternativa usada no lugar do ex1.
  ex1__v1: [{ type: 'forca', name: 'Supino com Halteres', series: [{ reps: 10, weight: 18 }], variantIndex: 1, date: '2026-09-21' }],
  // Troca avulsa.
  custom__crucifixo_maquina: [{ type: 'forca', name: 'Crucifixo Máquina', customName: 'Crucifixo Máquina', series: [{ reps: 12, weight: 30 }], date: '2026-09-21' }],
  ex3: [
    { type: 'forca', name: 'Puxada Frontal (Polia)', series: [{ reps: 12, weight: 35 }], date: '2026-09-15' },
    { type: 'forca', name: 'Puxada Frontal (Polia)', series: [{ reps: 12, weight: 35 }] }, // sem data: descartado
    { type: 'forca', name: 'Puxada Frontal (Polia)', series: [{ reps: 0, weight: 35 }], date: '2026-09-16' } // nenhuma série válida
  ],
  ex4: [{ type: 'cardio', name: 'Esteira', duration: '25', distance: '3', date: '2026-09-17' }],
  // Mesmo exercício em outro plano (c1) — mesmo nome, um histórico só no app novo.
  c1: [{ type: 'forca', name: 'Supino Reto (Barra)', series: [{ reps: 10, weight: 30 }], date: '2026-09-28' }]
};

// Último registro por exercício: um dia que não está no log (migração antiga) e um repetido.
const exerciseHistory = {
  ex6: { type: 'forca', name: 'Agachamento Livre', sets: 4, reps: 8, weight: 60, date: '2026-09-05' },
  ex1: sessionLog.ex1[1]
};

export const LEGACY_FIXTURE: Record<string, string> = {
  treino_profiles: JSON.stringify(profiles),
  treino_active_profile_id: 'default',
  treino_session_log: JSON.stringify(sessionLog),
  treino_exercise_history: JSON.stringify(exerciseHistory),
  treino_checkins: JSON.stringify({
    '2026-09-05': 'SAB', '2026-09-07': 'SEG', '2026-09-14': 'SEG', '2026-09-15': 'TER',
    '2026-09-17': 'QUI', '2026-09-21': 'SEG', '2026-09-28': true, '2026-09-30': 'QUA'
  }),
  treino_workout_meta: JSON.stringify({ '2026-09-14': { inicio: '2026-09-14T12:01:00.000Z', fim: '2026-09-14T13:02:00.000Z', minutos: 61 } }),
  treino_user_profile: JSON.stringify({
    name: 'Pessoa Teste', birthdate: '1995-09-19', sex: 'masculino', activityLevel: 'moderado', tmbFormula: 'mifflin',
    height: '175', weight: '80', targetWeight: '75', bodyFatPercent: '',
    weightGoal: { startWeight: 84, targetWeight: 75, startedAt: '2026-08-01', checkpoints: { 25: '2026-08-20', 50: '2026-09-25' } },
    weightHistory: [
      { date: '2026-09-01', weight: '82', imc: 26.8 }, { date: '2026-08-01', weight: 84 },
      { date: '2026-09-01', weight: 81.5 }, { date: 'ontem', weight: 80 }
    ]
  }),
  treino_water_log: JSON.stringify({ '2026-09-14': 2500, '2026-09-15': '1800', '2026-09-16': 0 }),
  treino_settings: JSON.stringify({ restSeconds: '75', restSound: false, trainingReminders: true }),
  treino_gamification: JSON.stringify({
    totalXP: 450, longestStreak: 5, checkins: { '2026-09-14': { amount: 100, full: true }, '2026-09-15': { amount: 50, full: false } },
    waterBonus: { '2026-09-14': true }, streakBonuses: { default_1: true }, freeMealRewards: {},
    unlockedAchievements: { first_checkin: '2026-09-05' }, birthdayGreeted: {}, nightCheckins: { '2026-09-17': true },
    equippedProfiles: { default: true, casa: true }
  }),
  treino_daily_completion: JSON.stringify({ '2026-09-14': { ex1: true, ex2: true } }),
  treino_hints_seen: JSON.stringify({ swipe: true }),
  treino_last_seen_version: '2.21.1',
  treino_last_backup_at: '2026-09-20T10:00:00.000Z',
  treino_optional_migrated: '1',
  treino_log_sanitized: '1'
};
