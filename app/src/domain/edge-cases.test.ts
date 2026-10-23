// M27: casos-limite das regras que mexem na carga e no histórico (progressão, 1RM, recordes e
// migração do app antigo), no estilo do openGym: uma regra por teste, nos limites dela.
import { describe, expect, test } from 'vitest';
import type { Workout, WorkoutSet } from './model';
import { repRange, suggestProgression } from './progression';
import { bestE1rm, e1rm, recordKinds, weightForReps } from './strength';
import { entryVolume } from './workouts';
import { migrateLegacy } from './legacy/migrate';
import { parseLegacyData } from './legacy/validate';

let n = 0;
/** Sessão de um exercício: séries [reps, carga] ou objetos completos. */
function session(date: string, sets: ([number, number] | WorkoutSet)[], extra: Partial<Workout> = {}, name = 'Supino Reto'): Workout {
  return {
    id: `w${++n}`, date, source: 'app', ...extra,
    entries: [{ key: name.toLowerCase(), name, mode: 'reps', sets: sets.map(s => (Array.isArray(s) ? { reps: s[0], weight: s[1], kind: 'work' as const } : s)) }]
  };
}
const target = (extra: object = {}) => ({ sets: 3, reps: 12, repMin: 8, repMax: 12, weight: 40, ...extra });
const suggest = (history: Workout[], t: object = target(), date = '2026-10-30', key = 'supino reto') => suggestProgression(history, key, t as never, date);

describe('progressão: faixa e referência', () => {
  test('faixa inválida no plano: mínimo maior que o máximo vira faixa de um número só', () => {
    expect(repRange({ reps: 10, repMin: 12, repMax: 8 })).toEqual({ min: 12, max: 12 });
    expect(repRange({ reps: 10, repMin: 0, repMax: 0 })).toEqual({ min: 10, max: 10 });
  });

  test('aquecimento mais pesado não vira a carga de referência nem conta como série', () => {
    const s = session('2026-10-20', [{ reps: 5, weight: 60, kind: 'warmup' }, [12, 40], [12, 40], [12, 40]]);
    expect(suggest([s])).toMatchObject({ kind: 'up', weight: 42.5 });
  });

  test('referência é a última série de trabalho: pirâmide que termina mais leve mantém a carga mais leve', () => {
    expect(suggest([session('2026-10-20', [[12, 45], [12, 45], [12, 40]])])).toMatchObject({ kind: 'keep', weight: 40, reason: expect.stringContaining('1 de 3 séries') });
  });

  test('mais séries que o plano, todas no topo, também sobe', () => {
    expect(suggest([session('2026-10-20', [[12, 40], [12, 40], [12, 40], [12, 40]])])).toMatchObject({ kind: 'up', weight: 42.5, reps: 8 });
  });

  test('treino do mesmo dia não entra na sugestão (só sessões de antes)', () => {
    expect(suggest([session('2026-10-30', [[12, 40], [12, 40], [12, 40]])])).toMatchObject({ kind: 'first', weight: 40 });
  });

  test('sem histórico e sem carga no plano: nenhuma sugestão', () => {
    expect(suggest([], target({ weight: 0 }))).toBeNull();
  });
});

describe('progressão: incremento e arredondamento', () => {
  test('incremento de 1,25 kg chega em carga que existe (41,25), não em 41,3', () => {
    expect(suggest([session('2026-10-20', [[12, 40], [12, 40], [12, 40]])], target({ increment: 1.25 }))).toMatchObject({ kind: 'up', weight: 41.25 });
  });

  test('incremento de 1 kg com carga quebrada não acumula erro de ponto flutuante', () => {
    expect(suggest([session('2026-10-20', [[12, 22.5], [12, 22.5], [12, 22.5]])], target({ increment: 1 }))).toMatchObject({ weight: 23.5 });
  });

  test('o motivo mostra a carga como ela é (41,25 kg)', () => {
    const s = suggest([session('2026-10-20', [[12, 41.25], [10, 41.25], [9, 41.25]])], target({ increment: 1.25 }));
    expect(s?.reason).toContain('41,25 kg');
  });
});

describe('progressão: estagnação e deload', () => {
  const stalled = (w: number) => ['2026-10-06', '2026-10-13', '2026-10-20'].map(d => session(d, [[10, w], [9, w], [8, w]]));

  test('três sessões na mesma carga sem evoluir pedem −10%, arredondado para baixo no incremento', () => {
    expect(suggest(stalled(40))).toMatchObject({ kind: 'deload', weight: 35 });
    expect(suggest(stalled(25))).toMatchObject({ kind: 'deload', weight: 22.5 });
    expect(suggest(stalled(100))).toMatchObject({ kind: 'deload', weight: 90 });
  });

  test('deload com incremento de 1,25 kg cai numa carga que existe', () => {
    expect(suggest(stalled(41.25), target({ increment: 1.25 }))).toMatchObject({ kind: 'deload', weight: 36.25 });
  });

  test('carga tão leve que o −10% daria zero: mantém, em vez de sugerir 0 kg', () => {
    const s = suggest(stalled(2.5));
    expect(s?.kind).toBe('keep');
    expect(s?.weight).toBe(2.5);
  });

  test('duas sessões paradas ainda não são estagnação', () => {
    expect(suggest(stalled(40).slice(1))).toMatchObject({ kind: 'keep', weight: 40 });
  });

  test('repetições crescendo na mesma carga não são estagnação', () => {
    const h = [session('2026-10-06', [[8, 40], [8, 40], [8, 40]]), session('2026-10-13', [[9, 40], [8, 40], [8, 40]]), session('2026-10-20', [[10, 40], [9, 40], [8, 40]])];
    expect(suggest(h)).toMatchObject({ kind: 'keep', weight: 40 });
  });

  test('treino de deload (M32) no meio não conta para estagnar nem para a referência', () => {
    const h = [...stalled(40).slice(0, 2), session('2026-10-15', [[10, 24], [10, 24], [10, 24]], { deload: true }), stalled(40)[2]!];
    expect(suggest(h)).toMatchObject({ kind: 'deload', weight: 35 });
  });
});

describe('progressão: registros antigos, falha e peso do corpo', () => {
  test('registro antigo reconstruído nunca sobe, mesmo com tudo no topo', () => {
    const s = session('2026-10-20', [[12, 40], [12, 40], [12, 40]]);
    s.entries[0]!.aggregated = true;
    expect(suggest([s])).toMatchObject({ kind: 'keep', weight: 40, reason: expect.stringContaining('registro antigo') });
  });

  test('peso do corpo: série a menos que o plano mantém o alvo', () => {
    const s = session('2026-10-20', [[15, 0], [15, 0]], {}, 'Flexão de Braço (Solo)');
    expect(suggest([s], { sets: 3, reps: 12, weight: 0 }, '2026-10-30', 'flexão de braço (solo)')).toMatchObject({ kind: 'keep', weight: 0, reps: 15 });
  });

  test('peso do corpo: todas no alvo pede uma repetição a mais; na falha, mantém', () => {
    const ok = session('2026-10-20', [[12, 0], [12, 0], [12, 0]], {}, 'Flexão de Braço (Solo)');
    expect(suggest([ok], { sets: 3, reps: 12, weight: 0 }, '2026-10-30', 'flexão de braço (solo)')).toMatchObject({ kind: 'up', reps: 13 });
    const fail = session('2026-10-20', [[12, 0], [12, 0], { reps: 12, weight: 0, kind: 'work', failure: true }], {}, 'Flexão de Braço (Solo)');
    expect(suggest([fail], { sets: 3, reps: 12, weight: 0 }, '2026-10-30', 'flexão de braço (solo)')).toMatchObject({ kind: 'keep', reps: 12 });
  });

  test('máquina sem carga anotada não vira progressão de repetições', () => {
    const s = session('2026-10-20', [[12, 0], [12, 0], [12, 0]], {}, 'Cadeira Extensora');
    expect(suggest([s], { sets: 3, reps: 12, weight: 0 }, '2026-10-30', 'cadeira extensora')).toBeNull();
  });
});

describe('1RM estimado', () => {
  test('limites: carga ou repetição zero, negativa ou acima de 12 não estimam', () => {
    expect(e1rm(0, 5)).toBeNull();
    expect(e1rm(-10, 5)).toBeNull();
    expect(e1rm(100, 0)).toBeNull();
    expect(e1rm(100, 13)).toBeNull();
    expect(e1rm(Number.NaN, 5)).toBeNull();
    expect(e1rm(100, 12)).toBe(140);
    expect(e1rm(100, 1)).toBe(100);
  });

  test('a calculadora volta à carga de origem', () => {
    for (const [w, r] of [[100, 5], [62.5, 8], [40, 12]] as const) expect(weightForReps(e1rm(w, r)!, r)).toBeCloseTo(w, 0);
    expect(weightForReps(120, 1)).toBe(120);
  });

  test('a melhor série ignora aquecimento e séries acima de 12 repetições', () => {
    const e = session('2026-10-20', [{ reps: 3, weight: 100, kind: 'warmup' }, [15, 60], [8, 50]]).entries[0]!;
    expect(bestE1rm(e)).toEqual({ value: 63.3, set: { reps: 8, weight: 50, kind: 'work' } });
  });
});

describe('recordes', () => {
  test('aquecimento pesado não é recorde de carga', () => {
    const before = session('2026-10-13', [[10, 50], [10, 50]]);
    const now = session('2026-10-20', [{ reps: 3, weight: 80, kind: 'warmup' }, [10, 50], [10, 50]]);
    expect(recordKinds([before, now], now, now.entries[0]!)).toEqual([]);
  });

  test('empate não é recorde; superar por 0,25 kg é', () => {
    const before = session('2026-10-13', [[10, 50]]);
    const same = session('2026-10-20', [[10, 50]]);
    expect(recordKinds([before, same], same, same.entries[0]!)).toEqual([]);
    const more = session('2026-10-20', [[10, 50.25]]);
    expect(recordKinds([before, more], more, more.entries[0]!)).toEqual(['e1rm', 'weight', 'volume']);
  });

  test('antes só séries longas (sem 1RM): a primeira estimativa não é recorde de 1RM', () => {
    const before = session('2026-10-13', [[15, 40], [15, 40]]);
    const now = session('2026-10-20', [[8, 45]]);
    expect(recordKinds([before, now], now, now.entries[0]!)).toEqual(['weight']);
  });

  test('treino do mesmo dia não compete; treino lançado depois com data antiga só compete com o que veio antes', () => {
    const morning = session('2026-10-20', [[10, 60]]);
    const evening = session('2026-10-20', [[10, 50]]);
    expect(recordKinds([morning, evening], evening, evening.entries[0]!)).toEqual([]);
    const old = session('2026-10-01', [[10, 40]]);
    const backdated = session('2026-10-05', [[10, 45]]);
    // morning (60 kg) é posterior: não impede o recorde do treino de 05/10 frente ao de 01/10
    expect(recordKinds([old, backdated, morning], backdated, backdated.entries[0]!)).toEqual(['e1rm', 'weight', 'volume']);
  });

  test('por lado (M31): volume conta os dois lados, então 8 por lado vence 12 no total', () => {
    const before = session('2026-10-13', [[12, 20]]);
    const now = session('2026-10-20', [[8, 20]]);
    now.entries[0]!.perSide = true;
    expect(entryVolume(now.entries[0]!)).toBe(320);
    expect(recordKinds([before, now], now, now.entries[0]!)).toContain('volume');
  });

  test('cardio e exercício sem série de trabalho não têm recorde', () => {
    const w: Workout = { id: 'c', date: '2026-10-20', source: 'app', entries: [{ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 30 } }] };
    expect(recordKinds([w], w, w.entries[0]!)).toEqual([]);
  });
});

describe('migração do app antigo: dados estranhos', () => {
  const NOW = new Date(2026, 9, 4, 12);
  const migrate = (sessionLog: object) => migrateLegacy(parseLegacyData({ treino_session_log: JSON.stringify(sessionLog) }), NOW);

  test('carga escrita com vírgula ("42,5") não vira zero', () => {
    const { data } = migrate({ ex1: [{ type: 'forca', name: 'Supino', series: [{ reps: '10', weight: '42,5' }], date: '2026-09-07' }] });
    expect(data.workouts[0]!.entries[0]!.sets[0]).toEqual({ reps: 10, weight: 42.5, kind: 'work' });
  });

  test('carga negativa vira zero e repetição quebrada é arredondada', () => {
    const { data } = migrate({ ex1: [{ type: 'forca', name: 'Supino', series: [{ reps: 8.6, weight: -5 }], date: '2026-09-07' }] });
    expect(data.workouts[0]!.entries[0]!.sets[0]).toEqual({ reps: 9, weight: 0, kind: 'work' });
  });

  test('data que não existe (mês 13) é descartada como sem data', () => {
    const { data, report } = migrate({ ex1: [{ type: 'forca', name: 'Supino', series: [{ reps: 10, weight: 40 }], date: '2026-13-45' }] });
    expect(data.workouts).toEqual([]);
    expect(report.skippedEntries).toBe(1);
  });

  test('formato antigo com zero séries não gera treino vazio', () => {
    const { data, report } = migrate({ ex1: [{ type: 'forca', name: 'Supino', sets: 0, reps: 10, weight: 40, date: '2026-09-07' }] });
    expect(data.workouts).toEqual([]);
    expect(report.skippedEntries).toBe(1);
  });

  test('cardio sem duração é descartado; com distância em texto, guarda os dois', () => {
    const { data, report } = migrate({
      c1: [{ type: 'cardio', name: 'Esteira', duration: '', date: '2026-09-07' }, { type: 'cardio', name: 'Esteira', duration: '30', distance: '4.5', date: '2026-09-08' }]
    });
    expect(report.skippedEntries).toBe(1);
    expect(data.workouts.map(w => w.entries[0]!.cardio)).toEqual([{ minutes: 30, km: 4.5 }]);
  });
});
