import { describe, expect, it } from 'vitest';
import { isBodyweight, repRange, suggestProgression } from './progression';
import { planExercise, sampleData, workout } from './testing';
import { startSession } from './session';
import type { Workout } from './model';

// planExercise: 3 séries × 10 reps · 20 kg
const target = (extra = {}) => planExercise('e1', 'Supino', extra);
const suggest = (ws: Workout[], extra = {}) => suggestProgression(ws, 'supino', target(extra), '2026-10-10');

describe('faixa de repetições', () => {
  it('sem faixa, vale só reps', () => expect(repRange({ reps: 10 })).toEqual({ min: 10, max: 10 }));
  it('com faixa', () => expect(repRange({ reps: 10, repMin: 8, repMax: 12 })).toEqual({ min: 8, max: 12 }));
  it('faixa invertida cai no mínimo', () => expect(repRange({ reps: 10, repMin: 12, repMax: 8 })).toEqual({ min: 12, max: 12 }));
});

describe('progressão dupla', () => {
  it('sem histórico: carga do plano, sem aviso', () => {
    expect(suggest([])).toEqual({ kind: 'first', weight: 20, reps: 10, reason: '' });
  });

  it('todas as séries no topo: sobe o incremento e volta ao início da faixa', () => {
    const p = suggest([workout('2026-10-01', 'Supino', [[12, 40], [12, 40], [12, 40]])], { repMin: 8, repMax: 12 });
    expect(p).toMatchObject({ kind: 'up', weight: 42.5, reps: 8 });
    expect(p?.reason).toBe('+2,5 kg: 12 reps nas 3 séries.');
  });

  it('respeita o incremento do exercício', () => {
    expect(suggest([workout('2026-10-01', 'Supino', [[10, 40], [10, 40], [10, 40]])], { increment: 1.25 })).toMatchObject({ kind: 'up', weight: 41.3 });
  });

  it('uma série abaixo do topo: mantém e mira o topo', () => {
    const p = suggest([workout('2026-10-01', 'Supino', [[12, 40], [10, 40], [9, 40]])], { repMin: 8, repMax: 12 });
    expect(p).toMatchObject({ kind: 'keep', weight: 40, reps: 12 });
    expect(p?.reason).toContain('12 · 10 · 9');
  });

  it('séries a menos que o plano nunca sobem a carga', () => {
    const p = suggest([workout('2026-10-01', 'Supino', [[10, 40], [10, 40]])]);
    expect(p).toMatchObject({ kind: 'keep', weight: 40 });
    expect(p?.reason).toContain('2 de 3 séries');
  });

  it('série mais leve no fim: a referência é a última, só as séries com ela contam', () => {
    expect(suggest([workout('2026-10-01', 'Supino', [[10, 45], [10, 40], [10, 40]])])).toMatchObject({ kind: 'keep', weight: 40 });
  });

  it('aquecimento não conta', () => {
    const w = workout('2026-10-01', 'Supino', [[10, 40], [10, 40], [10, 40]]);
    w.entries[0]!.sets.unshift({ reps: 3, weight: 20, kind: 'warmup' });
    expect(suggest([w])).toMatchObject({ kind: 'up', weight: 42.5 });
  });

  it('registro antigo: repete a carga e avisa', () => {
    const w = workout('2026-10-01', 'Supino', [[10, 40], [10, 40], [10, 40]]);
    w.entries[0]!.aggregated = true;
    expect(suggest([w])).toMatchObject({ kind: 'keep', weight: 40 });
  });

  it('peso do corpo: sem sugestão', () => {
    expect(suggest([workout('2026-10-01', 'Supino', [[10, 0], [10, 0], [10, 0]])])).toBeNull();
  });

  it('só olha sessões antes da data', () => {
    expect(suggest([workout('2026-10-10', 'Supino', [[10, 40], [10, 40], [10, 40]])])).toMatchObject({ kind: 'first' });
  });
});

describe('estagnação', () => {
  const stuck = (a: number[], b: number[], c: number[]) => [
    workout('2026-10-01', 'Supino', a.map(r => [r, 40] as [number, number])),
    workout('2026-10-03', 'Supino', b.map(r => [r, 40] as [number, number])),
    workout('2026-10-05', 'Supino', c.map(r => [r, 40] as [number, number]))
  ];

  it('3 treinos na mesma carga sem mais reps: deload de ~10% no incremento', () => {
    const p = suggest(stuck([10, 9, 8], [10, 8, 8], [10, 9, 8]));
    expect(p).toMatchObject({ kind: 'deload', weight: 35, reps: 10 });
    expect(p?.reason).toBe('−10%: 3 treinos sem evoluir com 40 kg.');
  });

  it('reps crescendo não é estagnação', () => {
    expect(suggest(stuck([10, 8, 7], [10, 8, 8], [10, 9, 8]))).toMatchObject({ kind: 'keep', weight: 40 });
  });

  it('só 2 treinos não basta', () => {
    expect(suggest(stuck([10, 9, 8], [10, 9, 8], [10, 9, 8]).slice(1))).toMatchObject({ kind: 'keep' });
  });
});

describe('treino abre com a sugestão', () => {
  const now = new Date(2026, 9, 7, 10); // quarta
  const data = (autoProgression?: boolean) => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Supino', { repMin: 8, repMax: 10 })];
    d.workouts = [workout('2026-10-01', 'Supino', [[10, 40], [10, 40], [10, 40]])];
    if (autoProgression !== undefined) d.settings.autoProgression = autoProgression;
    return d;
  };

  it('ligada: carga e reps sugeridas, com o porquê', () => {
    const ex = startSession(data(), 'p1', 'QUA', now, 's1')!.exercises[0]!;
    expect(ex.sets.map(s => [s.weight, s.reps])).toEqual([[42.5, 8], [42.5, 8], [42.5, 8]]);
    expect(ex.progression?.reason).toBe('+2,5 kg: 10 reps nas 3 séries.');
  });

  it('do plano (M13): carga e topo da faixa como estão no plano', () => {
    const d = data();
    d.settings.loadSource = 'plan';
    const ex = startSession(d, 'p1', 'QUA', now, 's1')!.exercises[0]!;
    expect(ex.sets.map(s => [s.weight, s.reps])).toEqual([[20, 10], [20, 10], [20, 10]]);
    expect(ex.progression).toBeUndefined();
  });

  it('última vez (M13) vale como a progressão desligada', () => {
    const d = data();
    d.settings.loadSource = 'last';
    expect(startSession(d, 'p1', 'QUA', now, 's1')!.exercises[0]!.sets[0]).toMatchObject({ weight: 40, reps: 10 });
  });

  it('desligada: carga da última sessão e reps do plano, sem aviso', () => {
    const ex = startSession(data(false), 'p1', 'QUA', now, 's1')!.exercises[0]!;
    expect(ex.sets.map(s => [s.weight, s.reps])).toEqual([[40, 10], [40, 10], [40, 10]]);
    expect(ex.progression).toBeUndefined();
  });
});

describe('série até a falha (S5)', () => {
  it('chegou ao topo, mas na falha: mantém a carga', () => {
    const w = workout('2026-10-01', 'Supino', [[10, 40], [10, 40], [10, 40]]);
    w.entries[0]!.sets[2]!.failure = true;
    const p = suggest([w]);
    expect(p).toMatchObject({ kind: 'keep', weight: 40 });
    expect(p?.reason).toContain('falha');
  });
});

describe('peso do corpo (M30)', () => {
  const bw = (sets: number[]) => [workout('2026-10-01', 'Flexão de Braço (Solo)', sets.map(r => [r, 0] as [number, number]))];
  const sug = (ws: Workout[], extra = {}) => suggestProgression(ws, 'flexão de braço (solo)', planExercise('e1', 'Flexão de Braço (Solo)', { weight: 0, ...extra }), '2026-10-10');

  it('todas as séries no alvo: uma rep a mais', () => {
    expect(sug(bw([10, 10, 10]))).toMatchObject({ kind: 'up', weight: 0, reps: 11 });
  });
  it('acima do plano, segue a partir do que já faz', () => {
    expect(sug(bw([14, 14, 14]))).toMatchObject({ kind: 'up', reps: 15 });
  });
  it('faltou rep: mantém o alvo', () => {
    expect(sug(bw([10, 9, 8]))).toMatchObject({ kind: 'keep', reps: 10 });
  });
  it('máquina sem carga anotada não ganha reps', () => {
    const ws = [workout('2026-10-01', 'Abdominal Crunch (Máquina)', [[10, 0], [10, 0], [10, 0]])];
    expect(suggestProgression(ws, 'abdominal crunch (máquina)', planExercise('e1', 'Abdominal Crunch (Máquina)', { weight: 0 }), '2026-10-10')).toBeNull();
  });
  it('reconhece peso do corpo pelo nome', () => {
    expect(['Barra Fixa (Pull-up)', 'Paralelas / Mergulho (Dips)', 'Prancha'].every(isBodyweight)).toBe(true);
    expect(['Mesa Flexora', 'Supino Reto (Barra)', 'Abdominal na Polia'].some(isBodyweight)).toBe(false);
  });
});
