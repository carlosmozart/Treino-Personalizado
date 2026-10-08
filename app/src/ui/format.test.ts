import { expect, test } from 'vitest';
import { dayTitle, formatClock, formatNumber, plural, relativeDate, shortDate } from './format';

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

test('última vez em dias, semanas, meses ou anos (R6)', () => {
  const today = '2026-10-07';
  expect(relativeDate('2026-10-07', today)).toBe('hoje');
  expect(relativeDate('2026-10-08', today)).toBe('hoje');
  expect(relativeDate('2026-10-06', today)).toBe('ontem');
  expect(relativeDate('2026-10-01', today)).toBe('há 6 dias');
  expect(relativeDate('2026-09-23', today)).toBe('há 2 semanas');
  expect(relativeDate('2026-06-07', today)).toBe('há 4 meses');
  expect(relativeDate('2025-10-07', today)).toBe('há 1 ano');
});
