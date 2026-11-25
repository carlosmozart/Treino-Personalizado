// 3.30.0: tempo por exercício (V14), pilha da máquina (T23) e nível de resistência no cardio (W19).
import { describe, expect, it } from 'vitest';
import { historyCsv } from './history-csv';
import { adjustWeights, addExerciseToSession, sessionToWorkout, startFreeSession, startSession, toggleSet, updateCardio } from './session';
import { formatStack, parseStack, snapStack } from './stack';
import { planExercise, sampleData, samplePlan, workout } from './testing';
import { describeEntry, entryMinutes, hasCardioLevel } from './workouts';

const T0 = new Date(2026, 10, 18, 18, 0);
const at = (min: number) => new Date(T0.getTime() + min * 60000);

describe('V14: tempo por exercício', () => {
  it('a hora da série vai para o treino e para a planilha; desmarcar apaga', () => {
    let s = startSession(sampleData(), 'p1', 'SEG', T0, 's1')!;
    s = toggleSet(toggleSet(toggleSet(s, 0, 0, at(2)), 0, 1, at(5)), 0, 2, at(8));
    expect(s.exercises[0]!.sets[0]!.at).toBe(at(2).toISOString());
    expect(toggleSet(s, 0, 0).exercises[0]!.sets[0]!.at).toBeUndefined();
    const w = sessionToWorkout(s, at(30))!;
    expect(entryMinutes(w.entries[0]!)).toBe(7); // 2 → 8 min, mais uma série
    expect(entryMinutes({ ...w.entries[0]!, sets: w.entries[0]!.sets.slice(0, 1) })).toBeNull();
    const line = historyCsv([w]).split('\r\n')[1]!;
    expect(line.endsWith(`;;${String(at(2).getHours()).padStart(2, '0')}:02;;`)).toBe(true);
  });
});

describe('T23: pilha da máquina', () => {
  it('lê listas e faixas, com vírgula decimal', () => {
    expect(parseStack('5-25/5')).toEqual([5, 10, 15, 20, 25]);
    expect(parseStack('7; 14 21, 28')).toEqual([7, 14, 21, 28]);
    expect(parseStack('5,10,15')).toEqual([5, 10, 15]);
    expect(parseStack('2,5-10/2,5')).toEqual([2.5, 5, 7.5, 10]);
    expect(parseStack('abc; 0; 2000')).toEqual([]);
    expect(formatStack(parseStack('5-100/5'))).toBe('5, 10, 15 … 100');
  });

  it('pino acima, abaixo e o mais perto', () => {
    const st = [10, 20, 30, 40];
    expect(snapStack(20, st, 'up')).toBe(30);
    expect(snapStack(40, st, 'up')).toBe(40);
    expect(snapStack(25, st, 'down')).toBe(20);
    expect(snapStack(24, st, 'near')).toBe(20);
    expect(snapStack(24, undefined, 'near')).toBe(24);
  });

  it('o treino abre num peso da pilha, subir é o próximo pino, e os botões andam de pino em pino', () => {
    const hist = [workout('2026-11-11', 'Cadeira Extensora', [[12, 40], [12, 40], [12, 40]])];
    const plan = samplePlan(() => [planExercise('a', 'Cadeira Extensora', { weight: 40, repMin: 8, repMax: 12, stack: [35, 40, 47, 54] })]);
    const s = startSession(sampleData({ workouts: hist, plans: { p1: plan } }), 'p1', 'SEG', at(0), 's')!;
    expect(s.exercises[0]!.progression?.kind).toBe('up');
    expect(s.exercises[0]!.sets[0]!.weight).toBe(47);
    expect(s.exercises[0]!.stack).toEqual([35, 40, 47, 54]);
    expect(adjustWeights(s, 0, 1).exercises[0]!.sets.map(x => x.weight)).toEqual([54, 54, 54]);
    expect(adjustWeights(s, 0, -1).exercises[0]!.sets.map(x => x.weight)).toEqual([40, 40, 40]);
  });
});

describe('W19: nível no cardio', () => {
  it('bicicleta e remo têm nível; abre no da última vez; vai para o histórico', () => {
    expect(hasCardioLevel('Bicicleta Ergométrica')).toBe(true);
    expect(hasCardioLevel('Remo Indoor')).toBe(true);
    expect(hasCardioLevel('Elíptico')).toBe(true);
    expect(hasCardioLevel('Esteira')).toBe(false);
    let s = addExerciseToSession(startFreeSession(T0, 's'), sampleData(), 'Bicicleta Ergométrica');
    s = updateCardio(updateCardio(s, 0, { level: 8, minutes: 25 }), 0, { done: true });
    const w = sessionToWorkout(s, at(30))!;
    expect(w.entries[0]!.cardio).toEqual({ minutes: 25, level: 8 });
    expect(describeEntry(w.entries[0]!)).toBe('25min · nível 8');
    const next = addExerciseToSession(startFreeSession(at(60 * 24), 's2'), sampleData({ workouts: [w] }), 'Bicicleta Ergométrica');
    expect(next.exercises[0]!.cardio?.level).toBe(8);
    expect(updateCardio(next, 0, { level: 99 }).exercises[0]!.cardio?.level).toBe(30);
  });
});
