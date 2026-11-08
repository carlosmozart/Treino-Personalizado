// V3 (séries da semana contra a faixa-alvo) e V4 (resumo da semana e do mês).
import { describe, expect, it } from 'vitest';
import { periodRecap, recapsFor } from './recap';
import { sampleData, workout } from './testing';
import { mostRoom, targetFor, weeklySets, withTarget } from './weekly-sets';

const sets = (n: number, reps = 10, kg = 40): [number, number][] => Array.from({ length: n }, () => [reps, kg]);

describe('V3: séries da semana por grupo', () => {
  it('conta as séries de trabalho da semana atual, por grupo, contra a faixa', () => {
    const d = sampleData();
    d.workouts = [
      workout('2026-11-09', 'Supino Reto (Barra)', sets(4)), // segunda
      workout('2026-11-11', 'Supino Inclinado (Halteres)', sets(4)),
      workout('2026-11-11', 'Rosca Direta (Barra)', sets(16), 'w-rosca'),
      workout('2026-11-02', 'Supino Reto (Barra)', sets(9), 'semana-passada')
    ];
    const weeks = weeklySets(d, new Date(2026, 10, 12, 10));
    const peito = weeks.find(w => w.group === 'Peito')!;
    expect(peito).toMatchObject({ sets: 8, target: { min: 10, max: 20 }, status: 'falta', missing: 2 });
    expect(weeks.find(w => w.group === 'Bíceps')).toMatchObject({ sets: 16, status: 'acima' });
    expect(weeks.find(w => w.group === 'Costas')).toMatchObject({ sets: 0, missing: 10 });
    expect(weeks.some(w => w.group === 'Cardio')).toBe(false);
    // o grupo com mais espaço: o que mais falta para o mínimo
    expect(mostRoom(weeks)!.group).toBe('Costas');
  });

  it('a semana começa no dia escolhido em Perfil', () => {
    const d = sampleData();
    d.workouts = [workout('2026-11-08', 'Supino Reto (Barra)', sets(3))]; // domingo
    expect(weeklySets(d, new Date(2026, 10, 12)).find(w => w.group === 'Peito')!.sets).toBe(0);
    d.settings.weekStart = 'dom';
    expect(weeklySets(d, new Date(2026, 10, 12)).find(w => w.group === 'Peito')!.sets).toBe(3);
  });

  it('faixa própria: corrige limites e, igual à padrão, deixa de ser guardada', () => {
    const own = withTarget({}, 'Peito', { min: 12, max: 8 });
    expect(own).toEqual({ Peito: { min: 12, max: 12 } });
    expect(targetFor({ weeklySetTargets: own }, 'Peito')).toEqual({ min: 12, max: 12 });
    expect(withTarget({ weeklySetTargets: own }, 'Peito', { min: 10, max: 20 })).toEqual({});
    expect(targetFor({}, 'Panturrilha')).toEqual({ min: 6, max: 12 });
  });

  it('todos no mínimo: nenhum grupo com espaço', () => {
    expect(mostRoom([{ group: 'Peito', sets: 12, target: { min: 10, max: 20 }, status: 'na faixa', missing: 0 }])).toBeNull();
  });
});

describe('V4: resumo da semana e do mês', () => {
  const d = () => {
    const x = sampleData();
    x.workouts = [
      workout('2026-10-26', 'Supino Reto (Barra)', sets(3, 10, 40), 'a'),
      workout('2026-11-03', 'Supino Reto (Barra)', sets(3, 10, 42.5), 'b'),
      workout('2026-11-05', 'Agachamento Livre (Barra)', sets(4, 8, 60), 'c'),
      workout('2026-11-06', 'Leg Press 45º', sets(4, 12, 100), 'd')
    ];
    return x;
  };

  it('os números do período: treinos, dias, volume, recordes e o grupo que mais trabalhou', () => {
    const r = periodRecap(d(), 'semana', '2026-11-02', '2026-11-08', '2 a 8 de nov.', '2026-11-02');
    expect(r).toMatchObject({ workouts: 3, days: 3, records: 1, topGroup: 'Pernas (Quadríceps)' });
    // 1275 + 1920 + 4800
    expect(r.volume).toBe(7995);
  });

  it('a semana que acabou aparece nos 3 primeiros dias da semana nova; o mês, nos 3 primeiros do mês', () => {
    expect(recapsFor(d(), new Date(2026, 10, 9, 10)).map(r => [r.kind, r.label])).toEqual([['semana', '2 a 8 de nov.']]);
    expect(recapsFor(d(), new Date(2026, 10, 11, 10)).map(r => r.kind)).toEqual(['semana']);
    expect(recapsFor(d(), new Date(2026, 10, 12, 10))).toEqual([]);
    // 1º/12: o mês de novembro (e a semana de 23 a 29, sem treino, não aparece)
    expect(recapsFor(d(), new Date(2026, 11, 1, 10)).map(r => [r.kind, r.label, r.workouts])).toEqual([['mes', 'novembro', 3]]);
  });

  it('semana que cruza o mês leva os dois meses no nome', () => {
    const x = d();
    expect(recapsFor(x, new Date(2026, 10, 2, 10)).find(r => r.kind === 'semana')!.label).toBe('26 de out. a 1 de nov.');
  });
});
