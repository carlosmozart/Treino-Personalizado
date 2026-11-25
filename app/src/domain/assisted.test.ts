// T11: exercícios assistidos (a carga é a ajuda).
import { describe, expect, it } from 'vitest';
import { isAssisted } from './assisted';
import { suggestProgression } from './progression';
import { compareSet } from './set-compare';
import { bestsBefore } from './set-records';
import { bestE1rm } from './strength';
import { entryVolume } from './workouts';
import { equipmentTag } from '../data/exercise-library';
import { workout } from './testing';

const NAME = 'Barra Fixa Assistida (Gravitron)';
const target = { sets: 3, reps: 10, repMin: 6, repMax: 10, weight: 30, increment: 5 } as Parameters<typeof suggestProgression>[2];

describe('T11: assistidos', () => {
  it('reconhece pelo nome; o gravitron é máquina', () => {
    expect(isAssisted(NAME)).toBe(true);
    expect(isAssisted('Paralela Assistida (Gravitron)')).toBe(true);
    expect(isAssisted('Barra Fixa (Pull-up)')).toBe(false);
    expect(equipmentTag(NAME)).toBe('Máquina');
  });

  it('chegou ao topo: tira ajuda; sem ajuda, vira peso do corpo', () => {
    const done = workout('2026-11-10', NAME, [[10, 30], [10, 30], [10, 30]]);
    const up = suggestProgression([done], NAME.toLowerCase(), target, '2026-11-24')!;
    expect(up).toMatchObject({ kind: 'up', weight: 25, reps: 6 });
    expect(up.reason).toContain('−5 kg de ajuda');
    const last = workout('2026-11-10', NAME, [[10, 5], [10, 5], [10, 5]]);
    expect(suggestProgression([last], NAME.toLowerCase(), target, '2026-11-24')).toMatchObject({ kind: 'up', weight: 0, reason: expect.stringContaining('Sem ajuda') });
    const short = workout('2026-11-10', NAME, [[10, 30], [8, 30], [7, 30]]);
    expect(suggestProgression([short], NAME.toLowerCase(), target, '2026-11-24')).toMatchObject({ kind: 'keep', weight: 30 });
  });

  it('a seta sobe com menos ajuda; volume é o peso do corpo menos a ajuda; sem 1RM nem recordes', () => {
    expect(compareSet({ weight: 30, reps: 8 }, { weight: 25, reps: 8 }, 'reps', true)).toBe('up');
    expect(compareSet({ weight: 25, reps: 8 }, { weight: 30, reps: 8 }, 'reps', true)).toBe('down');
    expect(compareSet({ weight: 30, reps: 8 }, { weight: 25, reps: 6 }, 'reps', true)).toBe('down');
    const w = workout('2026-11-10', NAME, [[10, 30], [8, 30]]);
    const entry = w.entries[0]!;
    expect(entryVolume(entry)).toBe(0);
    expect(entryVolume(entry, { bodyAt: () => 80 }, '2026-11-10')).toBe(10 * 50 + 8 * 50);
    expect(bestE1rm(entry)).toBeNull();
    expect(bestsBefore([w], entry.key, { id: 'x', date: '2026-11-24' })).toBeNull();
  });
});
