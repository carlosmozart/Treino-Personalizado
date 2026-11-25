// N15: apagar um treino do histórico e desfazer.
import { describe, expect, it } from 'vitest';
import { deleteWorkout, restoreWorkout } from './actions';
import { sampleData } from './testing';
import type { AppData, Workout } from './model';

const NOW = new Date(2026, 10, 24, 10);
const workout = (id: string, date: string): Workout => ({ id, date, entries: [] } as unknown as Workout);

describe('N15: desfazer o apagar treino', () => {
  it('o mesmo treino volta na ordem, sem a marca de apagado', () => {
    const base: AppData = { ...sampleData(), workouts: [workout('a', '2026-11-01'), workout('b', '2026-11-10'), workout('c', '2026-11-20')] };
    const b = base.workouts[1]!;
    const gone = deleteWorkout(base, 'b', NOW).data;
    expect(gone.sync.deleted['workout:b']).toBeDefined();
    const back = restoreWorkout(gone, b, new Date(2026, 10, 24, 10, 0, 5)).data;
    expect(back.workouts.map(w => w.id)).toEqual(['a', 'b', 'c']);
    expect(back.sync.deleted['workout:b']).toBeUndefined();
    expect(back.sync.changed['workout:b']).toBeDefined();
    expect(restoreWorkout(back, b, NOW).data).toBe(back);
  });
});
