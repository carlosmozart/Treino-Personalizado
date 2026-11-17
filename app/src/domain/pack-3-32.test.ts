// 3.32.0: aviso do descanso com a próxima série (W15), tamanho do texto (W17) e atividades (W10).
import { describe, expect, it } from 'vitest';
import { activitiesByMonth, activityLabel, addActivity, deleteActivity, durationText } from './activities';
import { isAppData } from './backup';
import { weekStrip } from './home';
import { nextSetHint, restAlarmBody } from './next-set';
import { streakOf } from './rewards';
import { completeExercise, startSession, toggleSet } from './session';
import { mergeAppData } from './sync';
import { planExercise, sampleData, samplePlan } from './testing';
import { textPercent, textScaleOf } from './text-scale';

const T0 = new Date(2026, 10, 16, 18, 0); // segunda
const at = (min: number) => new Date(T0.getTime() + min * 60000);

describe('W15: a próxima série no aviso do descanso', () => {
  const plan = samplePlan(() => [
    planExercise('a', 'Supino Reto', { weight: 80, reps: 8, sets: 2 }),
    planExercise('b', 'Barra Fixa', { weight: 0, reps: 6, sets: 1 }),
    planExercise('c', 'Prancha', { mode: 'time', seconds: 45, sets: 1 })
  ]);
  const start = () => startSession(sampleData({ plans: { p1: plan } }), 'p1', 'SEG', T0, 's')!;

  it('a série seguinte do mesmo exercício, depois o próximo exercício, depois a volta', () => {
    let s = toggleSet(start(), 0, 0, at(1));
    expect(restAlarmBody(s, 0)).toBe('Próxima: Supino Reto, 80 kg × 8');
    s = toggleSet(s, 0, 1, at(3));
    expect(nextSetHint(s, 0)).toBe('Barra Fixa, 6 repetições');
    s = completeExercise(s, 1, true, at(5));
    expect(nextSetHint(s, 1)).toBe('Prancha, 45 s');
    // pulou o supino e fez o resto: o aviso volta para o que ficou
    const skipped = completeExercise(completeExercise(start(), 1), 2);
    expect(nextSetHint(skipped, 2)).toBe('Supino Reto, 80 kg × 8');
  });

  it('carga quebrada com vírgula; sem nada por fazer, convida a concluir; sem treino, o texto de sempre', () => {
    const half = samplePlan(() => [planExercise('a', 'Rosca Direta', { weight: 12.5, reps: 10, sets: 1 })]);
    const s = startSession(sampleData({ plans: { p1: half } }), 'p1', 'SEG', T0, 's')!;
    expect(nextSetHint(s, null)).toBe('Rosca Direta, 12,5 kg × 10');
    expect(restAlarmBody(completeExercise(s, 0), 0)).toBe('Era a última série. Pode concluir o treino!');
    expect(restAlarmBody(null, null)).toBe('Bora para a próxima série!');
  });
});

describe('W17: tamanho do texto', () => {
  it('padrão quando ausente ou inválido; os passos vão de 90% a 120%', () => {
    expect(textScaleOf({})).toBe('padrao');
    expect(textPercent({})).toBe(100);
    expect(textScaleOf({ textScale: 'enorme' as never })).toBe('padrao');
    expect((['menor', 'padrao', 'maior', 'grande'] as const).map(t => textPercent({ textScale: t }))).toEqual([90, 100, 110, 120]);
  });
});

describe('W10: atividades e recuperação', () => {
  const today = '2026-11-16';
  const add = (data = sampleData(), extra = {}) => addActivity(data, { id: 'a1', date: today, kind: 'corrida', minutes: 45, note: ' 5 km no parque ', ...extra }, T0, today).data;

  it('registra, lista por mês e apaga; não mexe em treinos, check-ins nem XP', () => {
    const base = sampleData();
    const data = add(base);
    expect(data.activities!.a1).toEqual({ id: 'a1', date: today, kind: 'corrida', minutes: 45, note: '5 km no parque' });
    expect(data.checkins).toBe(base.checkins);
    expect(data.gamification).toBe(base.gamification);
    expect([...activitiesByMonth(data).keys()]).toEqual(['2026-11']);
    expect(isAppData(JSON.parse(JSON.stringify(data)))).toBe(true);
    const gone = deleteActivity(data, 'a1', at(1)).data;
    expect(gone.activities).toBeUndefined();
    expect(gone.sync.deleted['activity:a1']).toBeDefined();
  });

  it('recusa data futura, minutos fora de 1 a 600 e id repetido', () => {
    const base = sampleData();
    expect(add(base, { date: '2026-11-17' })).toBe(base);
    expect(add(base, { minutes: 0 })).toBe(base);
    expect(add(base, { minutes: 601 })).toBe(base);
    const once = add(base);
    expect(add(once)).toBe(once);
  });

  it('nomes e durações', () => {
    expect(activityLabel({ kind: 'sauna' })).toBe('Sauna');
    expect(activityLabel({ kind: 'outra', note: 'Vôlei de praia' })).toBe('Vôlei de praia');
    expect([30, 60, 90, 125].map(durationText)).toEqual(['30 min', '1 h', '1 h 30', '2 h 05']);
  });

  it('aparece na faixa da semana', () => {
    const day = weekStrip(add(), T0).find(d => d.date === today)!;
    expect(day.activities.map(a => a.kind)).toEqual(['corrida']);
    expect(day.trained).toBe(false);
  });

  it('só segura a sequência com o ajuste ligado', () => {
    // treinou sábado (14) e domingo (15) não é dia do plano de exemplo? usa check-ins diretos
    const base = sampleData();
    const withCheckins = { ...base, checkins: { '2026-11-12': { dayKey: 'QUI' as const }, '2026-11-14': { dayKey: 'SAB' as const } } };
    const friday = '2026-11-13';
    const plain = streakOf(withCheckins, new Date(2026, 10, 14, 20));
    const act = addActivity(withCheckins, { id: 'f', date: friday, kind: 'futebol', minutes: 60 }, T0, today).data;
    expect(streakOf(act, new Date(2026, 10, 14, 20))).toBe(plain);
    const on = { ...act, settings: { ...act.settings, activitiesKeepStreak: true } };
    expect(streakOf(on, new Date(2026, 10, 14, 20))).toBeGreaterThanOrEqual(plain);
    // sem plano, sexta sem treino quebraria: com a atividade, os dois treinos contam
    const noPlan = { ...on, activePlanId: null };
    expect(streakOf({ ...noPlan, settings: { ...noPlan.settings, activitiesKeepStreak: false } }, new Date(2026, 10, 14, 20))).toBe(1);
    expect(streakOf(noPlan, new Date(2026, 10, 14, 20))).toBe(2);
  });

  it('na junção de dois aparelhos, cada um mantém a sua e a apagada some dos dois', () => {
    const base = sampleData();
    const phone = add(base);
    const tablet = addActivity(base, { id: 'b2', date: today, kind: 'sauna', minutes: 20 }, at(2), today).data;
    const merged = mergeAppData(phone, tablet);
    expect(Object.keys(merged.activities!).sort()).toEqual(['a1', 'b2']);
    const deleted = deleteActivity(merged, 'a1', at(10)).data;
    expect(mergeAppData(deleted, phone).activities).toEqual({ b2: merged.activities!.b2 });
  });
});
