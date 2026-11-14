// 3.28.0: desafios do mês (V7), recordes por repetição (W16), nível de força (V9), ritmo do peso
// (T15) e reabrir o treino salvo sozinho (W4).
import { describe, expect, it } from 'vitest';
import { unlockAchievements } from './achievements';
import { awardChallenges, CHALLENGE_XP, daysLeftInMonth, monthChallenges, perfectMonths } from './challenges';
import { computeTotalXP, type Workout } from './model';
import { reopenSession, sessionToWorkout, toggleSet } from './session';
import { liftOf, repRecords, strengthLevel } from './strength-levels';
import { mergeAppData } from './sync';
import { sampleData, workout } from './testing';
import { weightPace } from './weight-pace';

const w = (date: string, name = 'Supino Reto', sets: [number, number][] = [[10, 50]], id = `w-${date}-${name}`) => workout(date, name, sets, id);

describe('V7: desafios do mês', () => {
  it('sem histórico: 8 treinos, todos os grupos ou recordes conforme o mês', () => {
    const list = monthChallenges(sampleData(), '2026-11');
    expect(list.map(c => c.id)).toEqual(['treinos', 'grupos', 'recordes']);
    expect(list[0]).toMatchObject({ target: 8, current: 0, done: false, goal: '8 treinos em novembro', key: '2026-11:treinos' });
  });

  it('com histórico: um pouco acima da média dos meses anteriores', () => {
    const d = sampleData();
    // 10 treinos em agosto, setembro e outubro, 500 kg cada (= 5.000 kg por mês)
    d.workouts = ['2026-08', '2026-09', '2026-10'].flatMap(m => Array.from({ length: 10 }, (_, i) => w(`${m}-${String(i + 1).padStart(2, '0')}`)));
    const list = monthChallenges(d, '2026-11');
    expect(list.find(c => c.id === 'treinos')!.target).toBe(11);
    expect(list.find(c => c.id === 'volume')!.target).toBe(5500);
    expect(list).toHaveLength(3);
  });

  it('cumprido dá XP uma vez, com aviso; a conquista vem junto', () => {
    const d = sampleData();
    d.workouts = Array.from({ length: 8 }, (_, i) => w(`2026-11-${String(i + 1).padStart(2, '0')}`));
    const first = unlockAchievements(d, new Date(2026, 10, 9));
    expect(first.data.gamification.challengeBonus).toEqual({ '2026-11:treinos': CHALLENGE_XP });
    expect(first.data.gamification.totalXP).toBe(computeTotalXP(d.gamification) + CHALLENGE_XP);
    expect(first.events).toContainEqual({ kind: 'challenge', title: 'Constância', goal: '8 treinos em novembro', xp: CHALLENGE_XP });
    expect(first.events).toContainEqual({ kind: 'achievement', name: 'Desafio Aceito' });
    expect(awardChallenges(first.data, new Date(2026, 10, 10)).done).toEqual([]);
    // a junção de dois aparelhos não soma duas vezes
    expect(mergeAppData(first.data, first.data).gamification.challengeBonus).toEqual({ '2026-11:treinos': CHALLENGE_XP });
  });

  it('mês perfeito e dias que faltam', () => {
    expect(perfectMonths({ '2026-11:treinos': 1, '2026-11:volume': 1, '2026-11:grupos': 1, '2026-10:treinos': 1 })).toBe(1);
    expect(daysLeftInMonth(new Date(2026, 10, 30))).toBe(1);
    expect(daysLeftInMonth(new Date(2026, 10, 1))).toBe(30);
  });
});

describe('W16 e V9: recordes por repetição e nível de força', () => {
  const ws: Workout[] = [w('2026-11-01', 'Supino Reto (Barra)', [[8, 80], [5, 85]]), w('2026-11-08', 'Supino Reto (Barra)', [[1, 95]])];

  it('a maior carga para cada número de repetições (8 × 80 também vale como 6)', () => {
    const r = repRecords(ws, 'supino reto (barra)');
    expect(r[0]).toMatchObject({ reps: 1, weight: 95, date: '2026-11-08' });
    expect(r[4]).toMatchObject({ reps: 5, weight: 85 });
    expect(r[5]).toMatchObject({ reps: 6, weight: 80 });
    expect(r[8]).toMatchObject({ reps: 9, weight: null });
    expect(r[8]!.estimate).toBeGreaterThan(0);
    expect(repRecords([], 'x')).toEqual([]);
  });

  it('nível pelo 1RM ÷ peso do corpo, com o próximo', () => {
    expect(liftOf('Supino Reto (Barra)')).toBe('supino');
    expect(liftOf('Supino Reto (Halteres)')).toBeNull();
    expect(liftOf('Agachamento Livre')).toBe('agachamento');
    expect(liftOf('Levantamento Terra Romeno')).toBeNull();
    expect(strengthLevel('supino', 80, 80, 'masculino')).toEqual({ level: 'Intermediário', ratio: 1, next: { level: 'Avançado', kg: 120 } });
    expect(strengthLevel('supino', 80, 80, 'feminino')!.level).toBe('Avançado');
    expect(strengthLevel('supino', 200, 80, '')!).toMatchObject({ level: 'Elite', next: null });
    expect(strengthLevel('supino', 40, 0, '')).toBeNull();
  });
});

describe('T15: ritmo semanal do peso', () => {
  const pts = [{ date: '2026-10-26', weight: 80 }, { date: '2026-11-02', weight: 79.6 }, { date: '2026-11-09', weight: 79.2 }, { date: '2026-11-14', weight: 78.9 }];
  it('kg e % por semana pela reta, comparado com a meta', () => {
    const lose = weightPace(pts, '2026-11-14', { startWeight: 82, targetWeight: 75 })!;
    expect(lose.kgPerWeek).toBeCloseTo(-0.4, 1);
    expect(lose.status).toBe('no ritmo');
    expect(weightPace(pts, '2026-11-14', { startWeight: 70, targetWeight: 80 })!.status).toBe('devagar');
    expect(weightPace(pts, '2026-11-14')!.status).toBe('descendo');
    // pouca coisa: sem ritmo
    expect(weightPace(pts.slice(-2), '2026-11-14')).toBeNull();
  });
});

describe('W4: reabrir o treino salvo sozinho', () => {
  it('volta com as séries marcadas e o mesmo id; a parada conta como pausa', () => {
    const saved: Workout = {
      id: 'w9', date: '2026-11-14', startedAt: new Date(2026, 10, 14, 18).toISOString(), endedAt: new Date(2026, 10, 14, 18, 40).toISOString(),
      durationMin: 40, source: 'app', planId: 'p1', dayKey: 'SAB', dayName: 'Treino A', autoFinished: true,
      entries: [{ key: 'supino reto', name: 'Supino Reto', mode: 'reps', sets: [{ reps: 10, weight: 60, kind: 'work' }] }]
    };
    const now = new Date(2026, 10, 14, 19, 30);
    const s = reopenSession(sampleData(), saved, now)!;
    expect(s.id).toBe('w9');
    expect(s.exercises[0]!.sets[0]).toMatchObject({ done: true, weight: 60 });
    expect(s.pausedMs).toBe(50 * 60000);
    const again = sessionToWorkout(toggleSet(s, 0, 0), new Date(2026, 10, 14, 19, 40));
    expect(again).toBeNull(); // desmarcou a única série
    const kept = sessionToWorkout(s, new Date(2026, 10, 14, 19, 40))!;
    expect(kept.durationMin).toBe(50);
    expect(kept.autoFinished).toBeUndefined();
  });
});
