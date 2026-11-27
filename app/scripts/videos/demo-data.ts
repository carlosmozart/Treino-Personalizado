// Dados fictícios dos vídeos (a "Ana", como nas capturas do README): 7 semanas de treinos no
// plano ABC em rotação, pesagens, água e medidas. Nada aqui vem de usuário real.
import { addDays, toDateKey } from '../../src/domain/dates';
import { emptyAppData, type AppData, type Workout } from '../../src/domain/model';
import { enableRotation, rotationOrder } from '../../src/domain/rotation';
import { normalizeExerciseName } from '../../src/domain/text';
import { PLAN_TEMPLATES } from '../../src/data/plan-templates';
import pkg from '../../package.json' with { type: 'json' };

/** Quarta-feira, 16/09/2026, fim de tarde: longe dos temas de época (Halloween e Natal). */
export const NOW = new Date(2026, 8, 16, 18, 30);

/** Instalação nova: nada além de dispensar os convites, para o vídeo mostrar a primeira abertura. */
export function freshData(): AppData {
  const data = emptyAppData();
  data.settings = { ...data.settings, trainingReminders: false };
  data.meta = { ...data.meta, lastSeenVersion: pkg.version, hintsSeen: { welcome: true, iosInstall: true, tour: true } };
  return data;
}

export function demoData({ tourSeen = true } = {}): AppData {
  const data = emptyAppData();
  const today = toDateKey(NOW);
  const plan = enableRotation(PLAN_TEMPLATES.find(t => t.id === 'abc')!.build(addDays(today, -60), 'demo'));
  for (const day of Object.values(plan.days)) {
    day.exercises.forEach((e, i) => { if (e.mode === 'reps') e.weight = Math.max(10, 40 - i * 6); });
  }
  data.plans[plan.id] = plan;
  data.activePlanId = plan.id;

  const order = rotationOrder(plan);
  const workouts: Workout[] = [];
  let session = 0;
  for (let d = -49; d < 0; d++) {
    const date = addDays(today, d);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (![1, 3, 5].includes(weekday)) continue;
    const dayKey = order[session % order.length]!;
    const day = plan.days[dayKey];
    const step = Math.floor(session / order.length); // uma volta na rotação = +2,5 kg
    workouts.push({
      id: `demo-${date}`, date, startedAt: `${date}T18:00:00.000Z`, endedAt: `${date}T19:05:00.000Z`, durationMin: 65,
      planId: plan.id, dayKey, dayName: day.name, source: 'app',
      entries: day.exercises.map(e => ({
        key: normalizeExerciseName(e.name), name: e.name, mode: e.mode,
        sets: e.mode === 'cardio' ? [] : Array.from({ length: e.sets }, (_, i) => ({
          reps: e.mode === 'time' ? (e.seconds ?? 30) : Math.max(6, (e.reps || 10) - (i === e.sets - 1 && step % 2 ? 1 : 0)),
          weight: e.mode === 'reps' ? e.weight + step * 2.5 : 0,
          kind: 'work' as const
        })),
        ...(e.mode === 'cardio' ? { cardio: { minutes: e.minutes || 20 } } : {})
      }))
    });
    data.checkins[date] = { dayKey };
    session++;
  }
  data.workouts = workouts;

  data.profile = {
    ...data.profile, name: 'Ana', birthdate: '1994-05-12', sex: 'feminino', heightCm: 168, weightKg: 66.2, targetWeightKg: 63,
    weighIns: Array.from({ length: 8 }, (_, i) => ({ date: addDays(today, -49 + i * 7), weight: Math.round((69 - i * 0.4) * 10) / 10 }))
  };
  for (let d = -6; d <= 0; d++) data.water[addDays(today, d)] = d === 0 ? 1250 : 2200;
  data.measurements = {
    [addDays(today, -42)]: { cintura: 78, quadril: 99, braco: 27.5, coxa: 56, gordura: 27 },
    [addDays(today, -21)]: { cintura: 76.5, quadril: 98, braco: 28, coxa: 56.5, gordura: 25.5 },
    [addDays(today, -1)]: { cintura: 75, quadril: 97, braco: 28.5, coxa: 57, gordura: 24 }
  };
  data.settings = { ...data.settings, trainingReminders: false, favorites: ['supino reto (barra)'] };
  data.meta = {
    ...data.meta, lastSeenVersion: pkg.version, lastBackupAt: NOW.toISOString(),
    hintsSeen: { welcome: true, progressao: true, iosInstall: true, ...(tourSeen ? { tour: true as const } : {}) }
  };
  return data;
}
