// V1 (seta em cada série) e V2 (nota em cada série).
import { describe, expect, it } from 'vitest';
import { historyCsv } from './history-csv';
import { compareSet, previousWorkSets, setTrends, trendLabel } from './set-compare';
import { duplicateSet, sessionToWorkout, setSetNote, startSession, toggleSet } from './session';
import { planExercise, sampleData, workout } from './testing';

const s = (weight: number, reps: number) => ({ weight, reps });

describe('V1: a seta contra a mesma série da última vez', () => {
  it('carga primeiro, depois repetições', () => {
    expect(compareSet(s(40, 10), s(42.5, 10), 'reps')).toBe('up');
    expect(compareSet(s(40, 10), s(40, 11), 'reps')).toBe('up');
    expect(compareSet(s(40, 10), s(40, 10), 'reps')).toBe('same');
    expect(compareSet(s(40, 10), s(40, 9), 'reps')).toBe('down');
    expect(compareSet(s(40, 10), s(37.5, 10), 'reps')).toBe('down');
  });

  it('mais carga com menos reps (ou o contrário): o 1RM estimado desempata', () => {
    // 40×10 ≈ 53,3; 45×8 = 57; 45×5 = 52,5
    expect(compareSet(s(40, 10), s(45, 8), 'reps')).toBe('up');
    expect(compareSet(s(40, 10), s(45, 5), 'reps')).toBe('down');
    // menos carga e mais reps: 35×14 passa do limite do 1RM, vale carga × reps (490 > 400)
    expect(compareSet(s(40, 10), s(35, 14), 'reps')).toBe('up');
  });

  it('peso do corpo pelas reps, prancha pelos segundos, cardio e sem par não têm seta', () => {
    expect(compareSet(s(0, 12), s(0, 14), 'reps')).toBe('up');
    expect(compareSet(s(0, 45), s(0, 60), 'time')).toBe('up');
    expect(compareSet(s(0, 60), s(5, 60), 'time')).toBe('up');
    expect(compareSet(s(0, 20), s(0, 20), 'cardio')).toBeNull();
    expect(compareSet(undefined, s(40, 10), 'reps')).toBeNull();
  });

  it('séries de trabalho na ordem; aquecimento não tem seta; série a mais não tem par', () => {
    const prev = [{ ...s(40, 10), kind: 'work' as const }, { ...s(40, 9), kind: 'work' as const }];
    const today = [{ ...s(20, 10), kind: 'warmup' as const }, { ...s(40, 10), kind: 'work' as const }, { ...s(40, 10), kind: 'work' as const }, { ...s(40, 8), kind: 'work' as const }];
    expect(setTrends(prev, today, 'reps')).toEqual([null, 'same', 'up', null]);
    expect(setTrends(null, today, 'reps')).toEqual([null, null, null, null]);
  });

  it('a última vez é antes deste treino: data anterior ou mais cedo no mesmo dia, nunca depois', () => {
    const a = { ...workout('2026-11-02', 'Supino', [[10, 40]], 'a'), startedAt: '2026-11-02T08:00:00.000Z' };
    const b = { ...workout('2026-11-05', 'Supino', [[10, 42.5]], 'b'), startedAt: '2026-11-05T08:00:00.000Z' };
    const c = { ...workout('2026-11-05', 'Supino', [[8, 45]], 'c'), startedAt: '2026-11-05T19:00:00.000Z' };
    const all = [a, b, c];
    expect(previousWorkSets(all, 'supino', b)?.[0]).toMatchObject({ weight: 40 });
    expect(previousWorkSets(all, 'supino', c)?.[0]).toMatchObject({ weight: 42.5 });
    expect(previousWorkSets(all, 'supino', a)).toBeNull();
  });

  it('frase para o leitor de tela', () => {
    expect(trendLabel('up', s(40, 10), 'reps')).toBe('Mais que da última vez (40 kg × 10)');
    expect(trendLabel('down', s(0, 45), 'time')).toBe('Menos que da última vez (45 s)');
  });
});

describe('V2: nota em cada série', () => {
  const session = () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Supino', { sets: 2 })];
    return startSession(d, 'p1', 'QUA', new Date(2026, 10, 4, 18), 's1')!;
  };

  it('grava, limpa espaços, corta em 200 e apaga quando vazia', () => {
    let x = setSetNote(session(), 0, 1, '  senti   o ombro ');
    expect(x.exercises[0]!.sets[1]!.note).toBe('senti o ombro');
    expect(setSetNote(x, 0, 1, 'senti o ombro')).toBe(x);
    expect(setSetNote(x, 0, 0, 'a'.repeat(300)).exercises[0]!.sets[0]!.note).toHaveLength(200);
    x = setSetNote(x, 0, 1, '   ');
    expect('note' in x.exercises[0]!.sets[1]!).toBe(false);
  });

  it('vai para o treino salvo e para a planilha; a cópia da série nasce sem nota', () => {
    let x = setSetNote(session(), 0, 0, 'pegada escorregou');
    expect(duplicateSet(x, 0, 0).exercises[0]!.sets[1]!.note).toBeUndefined();
    x = toggleSet(toggleSet(x, 0, 0), 0, 1);
    const w = sessionToWorkout(x, new Date(2026, 10, 4, 19))!;
    expect(w.entries[0]!.sets.map(st => st.note)).toEqual(['pegada escorregou', undefined]);
    const csv = historyCsv([w]).split('\r\n');
    expect(csv[0]).toContain(';Nota;Nota da série');
    expect(csv[1]!.endsWith(';pegada escorregou')).toBe(true);
    expect(csv[2]!.endsWith(';')).toBe(true);
  });
});
