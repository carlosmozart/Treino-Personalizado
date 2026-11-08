import { describe, expect, it } from 'vitest';
import { CAT_LINES, halloweenColors, halloweenInWorkout, halloweenOn, isHalloweenWindow, pickLine, PUMPKIN_LINES, pumpkinAvailable, seasonalPref } from './seasonal';
import {
  activeSeason, adventDay, adventDoors, canOpenDoor, giftAvailable, GIFT_LINES, seasonColors, seasonInWorkout, seasonOf, XMAS_CAT_LINES, yearNumbers
} from './seasonal';
import { sampleData, workout } from './testing';

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

describe('Natal (V5)', () => {
  it('janela de 1º a 31 de dezembro; o automático escolhe o tema pela data', () => {
    expect(seasonOf('2026-11-30')).toBeNull();
    expect(seasonOf('2026-12-01')).toBe('natal');
    expect(seasonOf('2026-12-31')).toBe('natal');
    expect(seasonOf('2027-01-01')).toBeNull();
    expect(activeSeason({}, '2026-12-10')).toBe('natal');
    expect(activeSeason({}, '2026-10-25')).toBe('halloween');
    expect(activeSeason({ seasonalTheme: 'off' }, '2026-12-10')).toBeNull();
  });

  it('"Sempre": Natal de novembro a janeiro, Halloween no resto do ano', () => {
    expect(activeSeason({ seasonalTheme: 'on' }, '2026-11-08')).toBe('natal');
    expect(activeSeason({ seasonalTheme: 'on' }, '2027-01-15')).toBe('natal');
    expect(activeSeason({ seasonalTheme: 'on' }, '2027-02-15')).toBe('halloween');
    expect(activeSeason({ seasonalTheme: 'on' }, '2026-10-25')).toBe('halloween');
  });

  it('cores e treino seguem o tema do dia', () => {
    expect(seasonColors({}, '2026-12-10')).toBe('natal');
    expect(seasonColors({ seasonalColors: false }, '2026-12-10')).toBeNull();
    expect(seasonInWorkout({}, '2026-12-10')).toBe(true);
    expect(seasonInWorkout({ seasonalInWorkout: false }, '2026-12-10')).toBe(false);
    expect(halloweenColors({}, '2026-12-10')).toBe(false);
  });

  it('calendário do advento: 1º a 24; abre hoje e os dias que passaram, não o futuro', () => {
    expect(adventDay('2026-11-30')).toBeNull();
    expect(adventDay('2026-12-01')).toBe(1);
    expect(adventDay('2026-12-24')).toBe(24);
    expect(adventDay('2026-12-25')).toBeNull();
    expect(canOpenDoor(8, '2026-12-08')).toBe(true);
    expect(canOpenDoor(3, '2026-12-08')).toBe(true);
    expect(canOpenDoor(9, '2026-12-08')).toBe(false);
    expect(canOpenDoor(1, '2026-12-26')).toBe(false);
  });

  it('24 portas; as do "Seu ano" usam o histórico, e a 24 é especial', () => {
    const d = sampleData();
    d.workouts = [workout('2026-03-01', 'Supino', [[10, 50], [10, 50]]), workout('2026-06-01', 'Supino', [[10, 100]]), workout('2025-12-01', 'Supino', [[10, 80]])];
    d.gamification.longestStreak = 12;
    const n = yearNumbers(d, 2026);
    expect(n).toEqual({ year: 2026, workouts: 2, tons: 2, longestStreak: 12 });
    const doors = adventDoors(n);
    expect(doors).toHaveLength(24);
    expect(doors[5]).toEqual({ kind: 'Seu ano', text: 'Você já fez 2 treinos em 2026. Cada um deles conta.' });
    expect(doors[11]!.text).toBe('Em 2026 você levantou 2 toneladas. É o peso de umas 13 renas. 🦌');
    expect(doors[17]!.text).toContain('12 dias');
    expect(doors[23]!.kind).toBe('Especial');
    // sem histórico, as portas do ano convidam a começar
    expect(adventDoors(yearNumbers(sampleData(), 2026))[5]!.text).toContain('primeiro treino');
  });

  it('o presente escondido e o gatinho de gorro', () => {
    expect(giftAvailable('2026-12-10', '2026-12-10')).toBe(false);
    expect(pickLine(GIFT_LINES, 0)).toBe(GIFT_LINES[0]);
    expect(XMAS_CAT_LINES[0]).toBe('Miau! Feliz Natal!');
  });
});
