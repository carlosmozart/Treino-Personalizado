// M49: drop-set e rest-pause.
import { describe, expect, it } from 'vitest';
import { restAfterSet, toggleTechnique, type ActiveSession, type SessionExercise } from './session';
import { bestE1rm } from './strength';
import { bestsBefore, setRecords } from './set-records';
import { describeEntry, entryVolume, straightSets } from './workouts';
import type { WorkoutEntry } from './model';

const ex = (sets: SessionExercise['sets']): SessionExercise => ({ slotId: 's', key: 'rosca', name: 'Rosca', mode: 'reps', sets } as unknown as SessionExercise);
const session = (e: SessionExercise): ActiveSession => ({ id: 'x', date: '2026-11-24', exercises: [e] } as unknown as ActiveSession);
const set = (weight: number, reps: number, over: Record<string, unknown> = {}) => ({ weight, reps, kind: 'work' as const, done: false, ...over });

describe('M49: drop-set e rest-pause', () => {
  it('marca e desmarca; não vale na primeira série nem depois de aquecimento', () => {
    const s = session(ex([set(20, 10, { kind: 'warmup' }), set(30, 10), set(20, 8)]));
    expect(toggleTechnique(s, 0, 0, 'drop')).toBe(s);
    expect(toggleTechnique(s, 0, 1, 'drop')).toBe(s);
    const marked = toggleTechnique(s, 0, 2, 'drop');
    expect(marked.exercises[0]!.sets[2]!.technique).toBe('drop');
    expect(toggleTechnique(marked, 0, 2, 'restpause').exercises[0]!.sets[2]!.technique).toBe('restpause');
    expect(toggleTechnique(marked, 0, 2, 'drop').exercises[0]!.sets[2]!.technique).toBeUndefined();
  });

  it('antes do drop-set não há descanso; antes do rest-pause, 15 s; o escolhido para a série vale acima', () => {
    const e = ex([set(30, 10), set(20, 8, { technique: 'drop' }), set(20, 4, { technique: 'restpause' })]);
    const settings = { restSeconds: 90 };
    expect(restAfterSet(e, 0, settings)).toBe(0);
    expect(restAfterSet(e, 1, settings)).toBe(15);
    expect(restAfterSet(e, 2, settings)).toBe(90);
    expect(restAfterSet(ex([set(30, 10, { rest: 30 }), set(20, 8, { technique: 'drop' })]), 0, settings)).toBe(30);
  });

  it('conta no volume, mas fica fora do 1RM, dos recordes e da referência', () => {
    const entry = { key: 'rosca', name: 'Rosca', mode: 'reps', sets: [
      { weight: 30, reps: 8, kind: 'work' }, { weight: 30, reps: 6, kind: 'work', technique: 'restpause' }, { weight: 20, reps: 10, kind: 'work', technique: 'drop' }
    ] } as WorkoutEntry;
    expect(straightSets(entry)).toHaveLength(1);
    expect(entryVolume(entry)).toBe(30 * 8 + 30 * 6 + 20 * 10);
    expect(bestE1rm(entry)!.set.reps).toBe(8);
    expect(describeEntry(entry)).toContain('drop-set · rest-pause');
    const bests = bestsBefore([], 'rosca', { id: 'x', date: '2026-11-24' }, []);
    const fresh = bests ?? { weight: 0, repsAt: new Map(), e1rm: 0 };
    expect(setRecords({ weight: 100, reps: 10, kind: 'work', technique: 'drop' }, fresh, 'reps')).toEqual([]);
  });
});
