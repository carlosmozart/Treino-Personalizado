// Análise do projeto: reabrir só no dia (X9), hora das séries marcadas de uma vez, treino mais
// leve na pilha da máquina e desafio contando dias (X11).
import { describe, expect, it } from 'vitest';
import { monthChallenges } from './challenges';
import type { Workout } from './model';
import { canReopen, completeExercise, lightenSession, startSession, toggleSet } from './session';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const T0 = new Date(2026, 10, 16, 18, 0); // segunda
const at = (min: number) => new Date(T0.getTime() + min * 60000);

describe('X9: reabrir o treino salvo sozinho', () => {
  const saved = (endedAt: Date, extra: Partial<Workout> = {}): Workout => ({
    ...workout('2026-11-16', 'Supino Reto', [[10, 60]], 'w1'),
    startedAt: T0.toISOString(), endedAt: endedAt.toISOString(), autoFinished: true, ...extra
  });

  it('vale no dia do treino e até 12 horas depois do fim', () => {
    const w = saved(at(40));
    expect(canReopen(w, at(60))).toBe(true);
    expect(canReopen(w, new Date(2026, 10, 16, 23, 59))).toBe(true);
    // virou o dia, mas ainda dentro das 12 horas
    expect(canReopen(w, new Date(2026, 10, 17, 6, 0))).toBe(true);
    expect(canReopen(w, new Date(2026, 10, 17, 7, 0))).toBe(false);
    expect(canReopen(w, new Date(2026, 10, 20, 18, 0))).toBe(false);
  });

  it('não vale para o treino concluído à mão nem para o vazio', () => {
    const { autoFinished: _a, ...manual } = saved(at(40));
    expect(canReopen(manual, at(60))).toBe(false);
    expect(canReopen(saved(at(40), { entries: [] }), at(60))).toBe(false);
  });
});

describe('X11: detalhes', () => {
  it('"marcar todas" grava a hora só nas séries que faltavam; desmarcar tira a hora', () => {
    const s0 = startSession(sampleData(), 'p1', 'SEG', T0, 's')!;
    const s1 = toggleSet(s0, 0, 0, at(2));
    const s2 = completeExercise(s1, 0, true, at(9));
    const sets = s2.exercises[0]!.sets;
    expect(sets.every(x => x.done)).toBe(true);
    expect(sets[0]!.at).toBe(at(2).toISOString());
    expect(sets.slice(1).every(x => x.at === at(9).toISOString())).toBe(true);
    expect(completeExercise(s2, 0, false).exercises[0]!.sets.every(x => !x.done && x.at === undefined)).toBe(true);
  });

  it('o treino mais leve desce para um pino da pilha', () => {
    const plan = samplePlan(() => [planExercise('a', 'Cadeira Extensora', { weight: 47, stack: [35, 40, 47, 54] })]);
    const s = startSession(sampleData({ plans: { p1: plan } }), 'p1', 'SEG', T0, 's')!;
    const start = s.exercises[0]!.sets[0]!.weight;
    expect(start).toBe(47);
    // 90% de 47 = 42,3: o pino logo abaixo é o de 40
    const light = lightenSession(s, 'carga', sampleData().settings);
    expect(light.exercises[0]!.sets.filter(x => x.kind === 'work').map(x => x.weight)).toEqual([40, 40, 40]);
  });

  it('no pino mais leve da pilha, a carga fica onde está', () => {
    const plan = samplePlan(() => [planExercise('a', 'Cadeira Extensora', { weight: 35, stack: [35, 40, 47, 54] })]);
    const s = startSession(sampleData({ plans: { p1: plan } }), 'p1', 'SEG', T0, 's')!;
    const light = lightenSession(s, 'carga', sampleData().settings);
    expect(light.exercises[0]!.sets.every(x => x.weight === 35)).toBe(true);
  });

  it('o desafio de constância conta dias: dois treinos no mesmo dia valem um', () => {
    const data = sampleData({ workouts: [
      workout('2026-11-02', 'Supino Reto', [[10, 50]], 'a'),
      workout('2026-11-02', 'Remada Curvada', [[10, 50]], 'b'),
      workout('2026-11-04', 'Supino Reto', [[10, 50]], 'c')
    ] });
    const c = monthChallenges(data, '2026-11').find(x => x.id === 'treinos')!;
    expect(c.goal).toBe('8 dias de treino em novembro');
    expect(c.current).toBe(2);
  });
});
