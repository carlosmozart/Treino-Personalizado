// 3.25.0: aquecimento automático (V8), descanso só desta série (T17) e as opções de volume (T22, V13).
import { describe, expect, it } from 'vitest';
import {
  addWarmupSet, adjustWeights, duplicateSet, removeWarmupSet, restAfterSet, sessionToWorkout, setSetRest, startSession, swapExercise, toggleSet, updateSet,
  type ActiveSession
} from './session';
import { planExercise, sampleData, samplePlan, workout } from './testing';
import { isCompound, warmupConfig, warmupRamp } from './warmup';
import { bodyWeightAt, entryVolume, liftsBodyweight, volumeOptions, workoutVolume } from './workouts';
import { weeklyVolume } from './stats';

const MONDAY = new Date(2026, 10, 9, 10, 0);
const BAR = { bar: 20, step: 2.5 };
const weights = (s: ActiveSession, i = 0) => s.exercises[i]!.sets.map(x => `${x.kind === 'warmup' ? 'A' : 'T'}${x.weight}×${x.reps}`);

function start(autoWarmup: boolean) {
  const data = sampleData({ plans: { p1: samplePlan(() => [
    planExercise('a', 'Agachamento Livre (Barra)', { weight: 100, sets: 2, reps: 5 }),
    planExercise('r', 'Rosca Direta (Barra)', { weight: 30 }),
    planExercise('l', 'Leg Press 45º', { weight: 200, sets: 1 })
  ]) } });
  data.settings.autoWarmup = autoWarmup;
  data.settings.loadSource = 'plan';
  return { data, s: startSession(data, 'p1', 'SEG', MONDAY, 's1')! };
}

describe('V8: aquecimento automático', () => {
  it('rampa: barra × 10, 40%, 60% e 80%, em barra + pares de anilhas', () => {
    expect(warmupRamp(100, BAR)).toEqual([{ reps: 10, weight: 20 }, { reps: 8, weight: 40 }, { reps: 5, weight: 60 }, { reps: 3, weight: 80 }]);
    // carga leve: os passos que caem na barra somem; 80% de 30 = 24 → 22,5 (nunca acima)
    expect(warmupRamp(30, BAR)).toEqual([{ reps: 10, weight: 20 }, { reps: 3, weight: 22.5 }]);
    expect(warmupRamp(20, BAR)).toEqual([]);
    // fora da barra: 2,5 kg, sem a barra vazia; abaixo de 20 kg, nada
    expect(warmupRamp(200, { bar: null, step: 2.5 })).toEqual([{ reps: 8, weight: 80 }, { reps: 5, weight: 120 }, { reps: 3, weight: 160 }]);
    expect(warmupRamp(15, { bar: null, step: 2.5 })).toEqual([]);
    // barra e anilhas de Perfil: só anilhas de 5 → passos de 10 kg
    expect(warmupConfig('Supino Reto (Barra)', { barWeight: 15, plates: [20, 10, 5] })).toEqual({ bar: 15, step: 10 });
    expect(warmupConfig('Leg Press 45º', {})).toEqual({ bar: null, step: 2.5 });
  });

  it('só nos compostos', () => {
    for (const n of ['Supino Reto (Barra)', 'Agachamento Livre (Barra)', 'Levantamento Terra', 'Remada Curvada (Barra)', 'Leg Press 45º', 'Desenvolvimento (Halteres)']) expect(isCompound(n)).toBe(true);
    for (const n of ['Rosca Direta (Barra)', 'Cadeira Extensora', 'Elevação Lateral', 'Tríceps Pulley', 'Crucifixo (Halteres)']) expect(isCompound(n)).toBe(false);
  });

  it('desligado por padrão; ligado, abre o treino com a rampa nos compostos', () => {
    expect(weights(start(false).s)).toEqual(['T100×5', 'T100×5']);
    const { s } = start(true);
    expect(weights(s)).toEqual(['A20×10', 'A40×8', 'A60×5', 'A80×3', 'T100×5', 'T100×5']);
    expect(s.exercises[0]!.sets[0]).toMatchObject({ kind: 'warmup', auto: true, done: false });
    expect(weights(s, 1)).toEqual(['T30×10', 'T30×10', 'T30×10']);
    expect(weights(s, 2)).toEqual(['A80×8', 'A120×5', 'A160×3', 'T200×10']);
  });

  it('acompanha a carga de trabalho; o que já foi feito fica', () => {
    let { s } = start(true);
    s = updateSet(s, 0, 4, { weight: 120 });
    expect(weights(s).slice(0, 4)).toEqual(warmupRamp(120, BAR).map(r => `A${r.weight}×${r.reps}`));
    // fez a barra e os 40%: a rampa continua de lá para cima
    s = toggleSet(toggleSet(s, 0, 0), 0, 1);
    s = adjustWeights(s, 0, -40);
    expect(s.exercises[0]!.sets.filter(x => x.kind === 'work').map(x => x.weight)).toEqual([80, 60]);
    // feitos: 20 e 47,5 (rampa de 120). A maior carga agora é 80: 40% e 60% (47,5) não passam do
    // que já foi feito; sobra o 80%
    expect(weights(s)).toEqual(['A20×10', 'A47.5×8', 'A62.5×3', 'T80×5', 'T60×5']);
    expect(s.exercises[0]!.sets.slice(0, 2).every(x => x.done)).toBe(true);
    // mudar só as reps da série de trabalho não mexe na rampa
    expect(updateSet(s, 0, 3, { reps: 6 }).exercises[0]!.sets.slice(0, 3)).toEqual(s.exercises[0]!.sets.slice(0, 3));
  });

  it('aquecimento mexido à mão ou tirado não volta sozinho', () => {
    const { s } = start(true);
    const edited = updateSet(s, 0, 1, { weight: 50 });
    expect(edited.exercises[0]!.sets[1]!.auto).toBeUndefined();
    expect(weights(updateSet(edited, 0, 4, { weight: 140 })).slice(0, 4)).toEqual(['A20×10', 'A50×8', 'A60×5', 'A80×3']);
    const removed = removeWarmupSet(s, 0);
    expect(weights(updateSet(removed, 0, 3, { weight: 140 }))).toEqual(['A20×10', 'A40×8', 'A60×5', 'T140×5', 'T100×5']);
    // aquecimento manual a mais também para a rampa
    const manual = addWarmupSet(s, 0);
    expect(weights(updateSet(manual, 0, 5, { weight: 140 })).filter(x => x.startsWith('A'))).toHaveLength(5);
  });

  it('carga zero na abertura: a rampa aparece quando a carga entra', () => {
    const data = sampleData({ plans: { p1: samplePlan(() => [planExercise('s', 'Supino Reto (Barra)', { weight: 0, sets: 1 })]) } });
    data.settings.autoWarmup = true;
    data.settings.loadSource = 'plan';
    let s = startSession(data, 'p1', 'SEG', MONDAY, 's1')!;
    expect(weights(s)).toEqual(['T0×10']);
    s = updateSet(s, 0, 0, { weight: 60 });
    expect(weights(s)).toEqual(['A20×10', 'A22.5×8', 'A35×5', 'A47.5×3', 'T60×10']);
  });

  it('trocar de exercício refaz a rampa para o novo; o histórico guarda o aquecimento sem marcas', () => {
    const { data, s } = start(true);
    const swapped = swapExercise(s, data, 1, 'Remada Curvada (Barra)');
    expect(swapped.exercises[1]!.sets.some(x => x.auto)).toBe(false); // sem carga (o plano era da rosca)
    const done = toggleSet(toggleSet(s, 0, 0), 0, 4);
    const w = sessionToWorkout(done, new Date(MONDAY.getTime() + 3600e3))!;
    expect(w.entries[0]!.sets).toEqual([{ reps: 10, weight: 20, kind: 'warmup' }, { reps: 5, weight: 100, kind: 'work' }]);
  });
});

describe('T17: descanso só desta série', () => {
  it('vale acima do exercício e do aquecimento; some na cópia; não vai para o histórico', () => {
    const { s } = start(false);
    const settings = { restSeconds: 90, warmupRest: 30 };
    let x = setSetRest(s, 0, 1, 180);
    expect(restAfterSet(x.exercises[0]!, 1, settings)).toBe(180);
    expect(restAfterSet(x.exercises[0]!, 0, settings)).toBe(90);
    x = setSetRest(x, 0, 0, 0);
    expect(restAfterSet(x.exercises[0]!, 0, settings)).toBe(0);
    expect(setSetRest(x, 0, 0, 0)).toBe(x);
    expect(setSetRest(x, 0, 0, undefined).exercises[0]!.sets[0]!.rest).toBeUndefined();
    expect(setSetRest(x, 0, 1, 9999).exercises[0]!.sets[1]!.rest).toBe(600);
    expect(duplicateSet(x, 0, 1).exercises[0]!.sets[2]!.rest).toBeUndefined();
    const w = sessionToWorkout(toggleSet(x, 0, 1), new Date(MONDAY.getTime() + 600e3))!;
    expect(w.entries[0]!.sets[0]).toEqual({ reps: 5, weight: 100, kind: 'work' });
  });
});

describe('T22 e V13: opções de volume', () => {
  const w = {
    id: 'w', date: '2026-11-05', source: 'app' as const,
    entries: [
      { key: 'supino', name: 'Supino Reto (Barra)', mode: 'reps' as const, sets: [{ reps: 10, weight: 20, kind: 'warmup' as const }, { reps: 8, weight: 60, kind: 'work' as const }] },
      { key: 'barra fixa', name: 'Barra Fixa', mode: 'reps' as const, sets: [{ reps: 8, weight: 0, kind: 'work' as const }, { reps: 6, weight: 10, kind: 'work' as const }] }
    ]
  };

  it('desligadas, a conta de sempre', () => {
    expect(volumeOptions(sampleData())).toBeUndefined();
    expect(workoutVolume(w)).toBe(480 + 60);
  });

  it('aquecimento e peso do corpo entram quando ligados', () => {
    const d = sampleData();
    d.settings.volumeWarmup = true;
    expect(workoutVolume(w, volumeOptions(d))).toBe(200 + 480 + 60);
    d.settings.volumeWarmup = false;
    d.settings.volumeBodyweight = true;
    d.profile.weighIns = [{ date: '2026-11-10', weight: 79 }, { date: '2026-11-01', weight: 75 }];
    // peso de 01/11 (75): 8 × 75 + 6 × 85
    expect(workoutVolume(w, volumeOptions(d))).toBe(480 + 600 + 510);
    expect(weeklyVolume({ ...d, workouts: [{ ...w, date: '2026-11-10' }] }, new Date(2026, 10, 11), 1)[0]!.volume).toBe(480 + 8 * 79 + 6 * 89);
  });

  it('peso do corpo na data, e quem levanta o corpo', () => {
    const p = { weightKg: 80, weighIns: [{ date: '2026-10-01', weight: 82 }, { date: '2026-11-01', weight: 78 }] };
    expect(bodyWeightAt(p, '2026-10-15')).toBe(82);
    expect(bodyWeightAt(p, '2026-09-01')).toBe(82);
    expect(bodyWeightAt({ weightKg: 80, weighIns: [] }, '2026-10-15')).toBe(80);
    expect(bodyWeightAt({ weightKg: null, weighIns: [] }, '2026-10-15')).toBeNull();
    for (const n of ['Barra Fixa', 'Barra Fixa Supinada', 'Paralelas', 'Mergulho nas Paralelas', 'Chin up']) expect(liftsBodyweight(n)).toBe(true);
    for (const n of ['Barra Fixa Assistida', 'Graviton', 'Supino Reto (Barra)', 'Mergulho na Máquina']) expect(liftsBodyweight(n)).toBe(false);
    // sem peso conhecido, conta só o lastro
    expect(entryVolume(w.entries[1]!, { bodyAt: () => null }, w.date)).toBe(60);
  });

  it('recordes não mudam com as opções', () => {
    const d = sampleData({ workouts: [workout('2026-11-01', 'Barra Fixa', [[8, 0]])] });
    d.settings.volumeBodyweight = true;
    expect(entryVolume(d.workouts[0]!.entries[0]!)).toBe(0);
  });
});
