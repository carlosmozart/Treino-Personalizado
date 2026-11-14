// 3.29.0: apelidos (T16), números de exercício novo (W14), juntar exercícios (V10), montar o treino
// do dia (W7) e deload sugerido (W9).
import { describe, expect, it } from 'vitest';
import { buildDay, startBuiltSession, yesterdayGroups } from './day-builder';
import { deloadSuggestion } from './deload-suggest';
import { mergeExercises, mergePreview, setAliases, undoMerge } from './exercise-merge';
import type { Workout } from './model';
import { newPlanExercise } from './plan-edit';
import { searchNames } from './search';
import { addExerciseToSession, startFreeSession } from './session';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const NOW = new Date(2026, 10, 18, 18); // quarta

describe('T16: outros nomes na busca', () => {
  it('o apelido acha o exercício; sem apelido, não', () => {
    const names = ['Supino Reto (Barra)', 'Crucifixo (Halteres)'];
    expect(searchNames('bench', names)).toEqual([]);
    expect(searchNames('bench', names, 6, undefined, undefined, { 'supino reto (barra)': ['Bench press'] })).toEqual(['Supino Reto (Barra)']);
    const d = setAliases(sampleData(), 'Supino Reto (Barra)', [' bench ', 'Bench', 'supino reto (barra)', ''], NOW).data;
    expect(d.settings.aliases).toEqual({ 'supino reto (barra)': ['Bench'] });
    expect(setAliases(d, 'Supino Reto (Barra)', [], NOW).data.settings.aliases).toEqual({});
  });
});

describe('W14: números de exercício novo', () => {
  it('no plano e no treino', () => {
    expect(newPlanExercise('Rosca', 'x', { sets: 2, reps: 8 })).toMatchObject({ sets: 2, reps: 8 });
    expect(newPlanExercise('Rosca', 'x')).toMatchObject({ sets: 3, reps: 10 });
    const d = sampleData();
    d.settings.newExerciseSets = 2;
    d.settings.newExerciseReps = 8;
    const s = addExerciseToSession(startFreeSession(NOW, 's'), d, 'Rosca Nova');
    expect(s.exercises[0]!.sets.map(x => x.reps)).toEqual([8, 8]);
  });
});

describe('V10: juntar dois exercícios', () => {
  const data = () => {
    const d = sampleData({
      workouts: [workout('2026-11-02', 'supino', [[10, 50]], 'a'), workout('2026-11-09', 'Supino Reto (Barra)', [[8, 60]], 'b')],
      plans: { p1: samplePlan(() => [planExercise('e1', 'supino', { alternatives: [{ name: 'Supino Reto (Barra)', mode: 'reps' }] }), planExercise('e2', 'Remada', { alternatives: [{ name: 'supino', mode: 'reps' }] })]) }
    });
    d.settings.favorites = ['supino'];
    return d;
  };

  it('prévia, histórico, plano, favoritos e o nome antigo como apelido', () => {
    expect(mergePreview(data(), 'supino', 'Supino Reto (Barra)')).toEqual({ workouts: 1, sets: 1, plans: 1 });
    const { result } = mergeExercises(data(), 'supino', 'Supino Reto (Barra)', NOW);
    const d = result.data;
    expect(d.workouts.map(w => w.entries[0]!.key)).toEqual(['supino reto (barra)', 'supino reto (barra)']);
    expect(d.plans.p1!.days.SEG.exercises[0]).toMatchObject({ name: 'Supino Reto (Barra)', alternatives: [] });
    expect(d.plans.p1!.days.SEG.exercises[1]!.alternatives).toEqual([{ name: 'Supino Reto (Barra)', mode: 'reps' }]);
    expect(d.settings.favorites).toEqual(['supino reto (barra)']);
    expect(d.settings.aliases).toEqual({ 'supino reto (barra)': ['supino'] });
    expect(d.sync.changed['workout:a']).toBe(NOW.toISOString());
  });

  it('Desfazer volta tudo como estava', () => {
    const before = data();
    const out = mergeExercises(before, 'supino', 'Supino Reto (Barra)', NOW);
    const back = undoMerge(out.result.data, out.undo, NOW).data;
    expect(back.workouts).toEqual(before.workouts);
    expect(back.plans).toEqual(before.plans);
    expect(back.settings).toEqual(before.settings);
  });

  it('o mesmo nome não junta', () => {
    const d = data();
    expect(mergeExercises(d, 'Supino', 'supino', NOW).result.data).toBe(d);
  });
});

describe('W7: montar o treino do dia', () => {
  it('reparte entre os grupos pelo tempo, com o equipamento e os favoritos', () => {
    const d = sampleData();
    expect(buildDay(d, ['Peito', 'Costas'], 40)).toHaveLength(5);
    expect(buildDay(d, ['Peito'], 20)).toHaveLength(3);
    expect(buildDay(d, [], 60)).toEqual([]);
    d.settings.availableEquipment = ['Halteres'];
    expect(buildDay(d, ['Peito'], 20).every(n => /Halteres/.test(n))).toBe(true);
    d.settings.availableEquipment = [];
    d.settings.favorites = ['crucifixo com halteres'];
    expect(buildDay(d, ['Peito'], 20)[0]).toBe('Crucifixo com Halteres');
  });

  it('vira um treino livre com nome; avisa o grupo de ontem', () => {
    const d = sampleData({ workouts: [workout('2026-11-17', 'Supino Reto (Barra)', [[10, 60]])] });
    expect(yesterdayGroups(d, '2026-11-18')).toEqual(['Peito']);
    const s = startBuiltSession(d, ['Peito'], ['Supino Reto (Barra)'], NOW, 's');
    expect(s.dayName).toBe('Treino do dia: Peito');
    expect(s.exercises[0]!.sets[0]!.weight).toBe(60);
  });
});

describe('W9: deload sugerido', () => {
  const week = (start: string, kg: number): Workout[] => [workout(start, 'Supino', [[5, kg]], `s-${start}`), workout(start, 'Agachamento', [[5, kg + 40]], `a-${start}`)];

  it('cargas caindo duas semanas seguidas', () => {
    const d = sampleData({ workouts: [...week('2026-10-26', 80), ...week('2026-11-02', 77.5), ...week('2026-11-09', 75)] });
    expect(deloadSuggestion(d, NOW)).toMatchObject({ reason: 'cargas', week: '2026-11-16' });
    d.settings.deloadSuggest = false;
    expect(deloadSuggestion(d, NOW)).toBeNull();
  });

  it('subindo, nada; a cada N semanas, quando pedido; nunca logo depois de um deload', () => {
    const up = sampleData({ workouts: [...week('2026-10-26', 70), ...week('2026-11-02', 72.5), ...week('2026-11-09', 75)] });
    expect(deloadSuggestion(up, NOW)).toBeNull();
    up.settings.deloadEvery = 3;
    expect(deloadSuggestion(up, NOW)).toMatchObject({ reason: 'tempo' });
    up.workouts = up.workouts.map(w => (w.date === '2026-11-09' ? { ...w, deload: true as const } : w));
    expect(deloadSuggestion(up, NOW)).toBeNull();
  });

  it('check-in puxado em 2 dos 3 últimos treinos', () => {
    const d = sampleData({ workouts: [
      { ...workout('2026-11-14', 'Supino', [[5, 70]], 'x'), form: { sono: 1 } },
      { ...workout('2026-11-16', 'Supino', [[5, 70]], 'y'), form: { energia: 2, dor: 4 } },
      { ...workout('2026-11-17', 'Supino', [[5, 70]], 'z'), form: { sono: 4 } }
    ] });
    expect(deloadSuggestion(d, NOW)).toMatchObject({ reason: 'cansaco' });
  });
});
