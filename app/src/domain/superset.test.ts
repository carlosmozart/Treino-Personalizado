import { describe, expect, it } from 'vitest';
import { afterSet, startSession, supersetBlock, toggleSupersetWithNext } from './session';
import { planExercise, sampleData } from './testing';

let n = 0;
const id = () => `g${++n}`;
const four = () => [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] as { name: string; superset?: string }[];

describe('superset (M17)', () => {
  it('junta com o próximo e forma o bloco', () => {
    const l = toggleSupersetWithNext(four(), 0, id);
    expect(supersetBlock(l, 0)).toEqual({ start: 0, end: 1 });
    expect(supersetBlock(l, 2)).toBeNull();
    // juntar o B com o C aumenta o bloco para três
    const l2 = toggleSupersetWithNext(l, 1, id);
    expect(supersetBlock(l2, 2)).toEqual({ start: 0, end: 2 });
  });

  it('separa: quem sobra sozinho perde a marca', () => {
    const l = toggleSupersetWithNext(toggleSupersetWithNext(four(), 0, id), 0, id);
    expect(l.every(x => !x.superset)).toBe(true);
  });

  it('separar no meio de um trio deixa um par', () => {
    let l = toggleSupersetWithNext(four(), 0, id);
    l = toggleSupersetWithNext(l, 1, id);
    l = toggleSupersetWithNext(l, 0, id); // separa A de B
    expect(l[0]!.superset).toBeUndefined();
    expect(supersetBlock(l, 1)).toEqual({ start: 1, end: 2 });
  });

  it('descanso só no fim da rodada; antes, vai para o parceiro', () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('a', 'Supino', { superset: 's1' }), planExercise('b', 'Remada', { superset: 's1' }), planExercise('c', 'Rosca')];
    const s = startSession(d, 'p1', 'QUA', new Date(2026, 9, 7, 10), 's')!;
    expect(s.exercises[0]!.superset).toBe('s1');
    expect(afterSet(s, 0)).toEqual({ rest: false, next: 1 });
    expect(afterSet(s, 1)).toEqual({ rest: true, next: 0 });
    expect(afterSet(s, 2)).toEqual({ rest: true, next: null });
  });
});
