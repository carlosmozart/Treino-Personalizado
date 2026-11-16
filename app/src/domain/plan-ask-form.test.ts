// Carga travada, "Salvar no plano?" (séries, reps fora da faixa, aquecimento), W1 (plano a partir
// de um treino feito) e W2 (check-in do dia e treino mais leve).
import { describe, expect, it } from 'vitest';
import { roughDay } from './daily-form';
import { progressionWorkouts } from './deload';
import type { Workout } from './model';
import { lockPatch, planFromWorkout, repsPatch, setsPatch, updateExercise, warmupPatch, entryToPlanExercise } from './plan-edit';
import { lightenSession, sessionToWorkout, setExerciseLock, setSessionForm, startSession, toggleSet } from './session';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const MONDAY = new Date(2026, 10, 16, 18);

describe('carga travada', () => {
  it('abre com a carga do plano e sem sugestão de subir', () => {
    const hist = [workout('2026-11-09', 'Supino Reto', [[12, 40], [12, 40], [12, 40]])];
    const free = startSession(sampleData({ workouts: hist, plans: { p1: samplePlan(() => [planExercise('a', 'Supino Reto', { weight: 40, repMin: 8, repMax: 12 })]) } }), 'p1', 'SEG', MONDAY, 's')!;
    expect(free.exercises[0]!.progression?.kind).toBe('up');
    const locked = startSession(sampleData({ workouts: hist, plans: { p1: samplePlan(() => [planExercise('a', 'Supino Reto', { weight: 40, repMin: 8, repMax: 12, lockWeight: true })]) } }), 'p1', 'SEG', MONDAY, 's')!;
    expect(locked.exercises[0]).toMatchObject({ lockWeight: true });
    expect(locked.exercises[0]!.progression).toBeUndefined();
    expect(locked.exercises[0]!.sets.every(x => x.weight === 40 && x.reps === 8)).toBe(true);
  });

  it('travar no treino tira a sugestão; o plano guarda a carga', () => {
    const s = startSession(sampleData({ workouts: [workout('2026-11-09', 'Supino Reto', [[10, 40]])] }), 'p1', 'SEG', MONDAY, 's')!;
    const locked = setExerciseLock(s, 0, true);
    expect(locked.exercises[0]).toMatchObject({ lockWeight: true });
    expect(locked.exercises[0]!.progression).toBeUndefined();
    expect(setExerciseLock(locked, 0, true)).toBe(locked);
    expect(lockPatch(true, 42.5)).toEqual({ lockWeight: true, weight: 42.5 });
    const plan = updateExercise(samplePlan(), 'SEG', 'e1', lockPatch(true, 42.5));
    expect(plan.days.SEG.exercises[0]).toMatchObject({ lockWeight: true, weight: 42.5 });
    expect('lockWeight' in updateExercise(plan, 'SEG', 'e1', lockPatch(false)).days.SEG.exercises[0]!).toBe(false);
  });
});

describe('salvar no plano', () => {
  it('séries: só pergunta quando muda', () => {
    expect(setsPatch({ sets: 3 }, 3)).toBeNull();
    expect(setsPatch({ sets: 3 }, 4)).toEqual({ sets: 4 });
  });

  it('repetições: dentro da faixa é progressão; fora, a faixa cresce', () => {
    const ex = { reps: 12, repMin: 8, repMax: 12 };
    expect(repsPatch(ex, 10)).toBeNull();
    expect(repsPatch(ex, 15)).toEqual({ reps: 15, repMin: 8, repMax: 15 });
    expect(repsPatch(ex, 6)).toEqual({ reps: 12, repMin: 6, repMax: 12 });
    // reps fixas: uma ou duas de diferença é o dia a dia; a partir de 3, troca o número
    expect(repsPatch({ reps: 10 }, 11)).toBeNull();
    expect(repsPatch({ reps: 10 }, 8)).toBeNull();
    expect(repsPatch({ reps: 10 }, 13)).toEqual({ reps: 13 });
    expect(repsPatch({ reps: 10 }, 7)).toEqual({ reps: 7 });
    expect(repsPatch({ reps: 10 }, 0)).toBeNull();
  });

  it('aquecimento: o plano guarda quantas séries, e o treino abre com elas', () => {
    expect(warmupPatch({}, 1)).toEqual({ warmupSets: 1 });
    expect(warmupPatch({ warmupSets: 1 }, 1)).toBeNull();
    expect(warmupPatch({ warmupSets: 2 }, 0)).toEqual({ warmupSets: 0 });
    const s = startSession(sampleData({ plans: { p1: samplePlan(() => [planExercise('a', 'Supino Reto', { weight: 60, warmupSets: 2 })]) } }), 'p1', 'SEG', MONDAY, 's')!;
    expect(s.exercises[0]!.sets.map(x => `${x.kind}:${x.weight}x${x.reps}`)).toEqual(['warmup:30x10', 'warmup:30x10', 'work:60x10', 'work:60x10', 'work:60x10']);
    expect('warmupSets' in updateExercise(samplePlan(), 'SEG', 'e1', { warmupSets: 0 }).days.SEG.exercises[0]!).toBe(false);
  });
});

describe('W1: plano a partir de um treino feito', () => {
  const w: Workout = {
    id: 'w1', date: '2026-11-11', source: 'app', dayName: 'Peito e tríceps', // quarta
    entries: [
      { key: 'supino reto', name: 'Supino Reto', mode: 'reps', sets: [
        { reps: 10, weight: 20, kind: 'warmup' }, { reps: 12, weight: 50, kind: 'work' }, { reps: 10, weight: 50, kind: 'work' }, { reps: 8, weight: 50, kind: 'work' }
      ] },
      { key: 'prancha', name: 'Prancha', mode: 'time', sets: [{ reps: 45, weight: 0, kind: 'work' }] }
    ]
  };

  it('a faixa vem das repetições feitas e o aquecimento vai junto', () => {
    expect(entryToPlanExercise(w.entries[0]!, 'x')).toMatchObject({ sets: 3, repMin: 8, repMax: 12, weight: 50, warmupSets: 1 });
    expect(entryToPlanExercise(w.entries[1]!, 'y')).toMatchObject({ mode: 'time', seconds: 45 });
  });

  it('plano novo: o treino no dia da semana em que foi feito, com o nome dele', () => {
    let n = 0;
    const p = planFromWorkout(w, 'novo', '2026-11-14', () => `ex${n++}`);
    expect(p.name).toBe('Peito e tríceps');
    expect(p.days.QUA.exercises.map(e => e.name)).toEqual(['Supino Reto', 'Prancha']);
    expect(p.days.SEG.exercises).toEqual([]);
    expect(planFromWorkout({ ...w, dayName: 'Treino livre' }, 'x', '2026-11-14').name).toBe('Meu treino');
  });
});

describe('W2: check-in do dia e treino mais leve', () => {
  it('dia puxado: dois sinais ruins ou um extremo', () => {
    expect(roughDay({})).toBe(false);
    expect(roughDay({ sono: 2, energia: 4 })).toBe(false);
    expect(roughDay({ sono: 2, dor: 4 })).toBe(true);
    expect(roughDay({ energia: 1 })).toBe(true);
    expect(roughDay({ dor: 5 })).toBe(true);
    expect(roughDay({ estresse: 5 })).toBe(false);
  });

  const start = () => startSession(sampleData({ plans: { p1: samplePlan(() => [
    planExercise('a', 'Supino Reto (Barra)', { weight: 60, sets: 3 }),
    planExercise('b', 'Rosca Direta (Halteres)', { weight: 12, sets: 3 }),
    planExercise('c', 'Esteira', { mode: 'cardio' })
  ]) } }), 'p1', 'SEG', MONDAY, 's')!;

  it('10% a menos nas séries que faltam, arredondado para baixo ao passo', () => {
    const s = lightenSession(toggleSet(start(), 0, 0), 'carga', {});
    expect(s.exercises[0]!.sets.map(x => x.weight)).toEqual([60, 52.5, 52.5]); // 54 → 20 + 2,5 × 13 = 52,5
    expect(s.exercises[1]!.sets.map(x => x.weight)).toEqual([10.5, 10.5, 10.5]); // halteres leves: passo de 0,5
    expect(s.light).toBe('carga');
    expect(lightenSession(s, 'series', {})).toBe(s);
  });

  it('uma série a menos, sem tirar a última que sobra', () => {
    const s = lightenSession(start(), 'series', {});
    expect(s.exercises.slice(0, 2).map(e => e.sets.length)).toEqual([2, 2]);
  });

  it('o treino salvo leva o check-in e fica fora da progressão', () => {
    let s = setSessionForm(start(), { sono: 1, energia: 9 as number, dor: 3 });
    expect(s.form).toEqual({ sono: 1, dor: 3 });
    s = lightenSession(toggleSet(s, 0, 0), 'carga', {});
    const saved = sessionToWorkout(s, new Date(MONDAY.getTime() + 3600e3))!;
    expect(saved).toMatchObject({ light: 'carga', form: { sono: 1, dor: 3 } });
    expect(progressionWorkouts([saved, workout('2026-11-09', 'Supino Reto (Barra)', [[10, 60]])]).map(x => x.id)).not.toContain(saved.id);
    // check-in pulado: nada no treino
    const skipped = sessionToWorkout(toggleSet(setSessionForm(start(), {}), 0, 0), new Date(MONDAY.getTime() + 600e3))!;
    expect('form' in skipped).toBe(false);
  });
});
