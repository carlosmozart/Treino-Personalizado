import { expect, test } from 'vitest';
import { dayTitle, formatClock, formatNumber, plural, shortDate } from './format';

test('formata números, datas, relógio e plural', () => {
  expect(formatNumber(42.5)).toBe('42,5');
  expect(formatNumber(40)).toBe('40');
  expect(shortDate('2026-10-02')).toBe('2 out');
  expect(formatClock(65)).toBe('1:05');
  expect(formatClock(3725)).toBe('1:02:05');
  expect(plural(1, 'série', 'séries')).toBe('1 série');
  expect(plural(0, 'série', 'séries')).toBe('0 séries');
});

test('título do dia não repete "(Opcional)" (O2)', () => {
  const day = { name: 'Domingo: Extra (Opcional)', focus: '', optional: true, exercises: [] };
  expect(dayTitle(day, 'DOM')).toEqual({ title: 'Domingo: Extra', optional: true });
  expect(dayTitle({ ...day, name: '' }, 'QUA')).toEqual({ title: 'Quarta', optional: true });
});
