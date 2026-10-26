import { describe, expect, it } from 'vitest';
import { CAT_LINES, halloweenColors, halloweenInWorkout, halloweenOn, isHalloweenWindow, pickLine, PUMPKIN_LINES, pumpkinAvailable, seasonalPref } from './seasonal';

describe('tema de Halloween', () => {
  it('janela do automático: 20 a 31 de outubro, de qualquer ano', () => {
    expect(isHalloweenWindow('2026-10-19')).toBe(false);
    expect(isHalloweenWindow('2026-10-20')).toBe(true);
    expect(isHalloweenWindow('2026-10-31')).toBe(true);
    expect(isHalloweenWindow('2026-11-01')).toBe(false);
    expect(isHalloweenWindow('2027-10-25')).toBe(true);
    expect(isHalloweenWindow('2026-12-25')).toBe(false);
  });

  it('automático por padrão; sempre vale o ano todo; desligado nunca', () => {
    expect(seasonalPref({})).toBe('auto');
    expect(halloweenOn({}, '2026-10-26')).toBe(true);
    expect(halloweenOn({}, '2026-11-01')).toBe(false);
    expect(halloweenOn({ seasonalTheme: 'on' }, '2026-03-10')).toBe(true);
    expect(halloweenOn({ seasonalTheme: 'off' }, '2026-10-31')).toBe(false);
  });

  it('cores e versão do treino só com o tema valendo, e ligadas por padrão', () => {
    expect(halloweenColors({}, '2026-10-26')).toBe(true);
    expect(halloweenColors({ seasonalColors: false }, '2026-10-26')).toBe(false);
    expect(halloweenColors({}, '2026-11-02')).toBe(false);
    expect(halloweenInWorkout({}, '2026-10-26')).toBe(true);
    expect(halloweenInWorkout({ seasonalInWorkout: false }, '2026-10-26')).toBe(false);
    expect(halloweenInWorkout({ seasonalTheme: 'off' }, '2026-10-26')).toBe(false);
  });

  it('a abóbora dá a surpresa uma vez por dia', () => {
    expect(pumpkinAvailable(null, '2026-10-26')).toBe(true);
    expect(pumpkinAvailable('2026-10-26', '2026-10-26')).toBe(false);
    expect(pumpkinAvailable('2026-10-25', '2026-10-26')).toBe(true);
  });

  it('frases escolhidas pelo número, sem sair da lista', () => {
    expect(pickLine(CAT_LINES, 0)).toBe(CAT_LINES[0]);
    expect(pickLine(CAT_LINES, CAT_LINES.length + 1)).toBe(CAT_LINES[1]);
    expect(pickLine(PUMPKIN_LINES, 937.4)).toBe(PUMPKIN_LINES[937 % PUMPKIN_LINES.length]);
    expect(pickLine(PUMPKIN_LINES, -3)).toBe(PUMPKIN_LINES[3]);
  });
});
