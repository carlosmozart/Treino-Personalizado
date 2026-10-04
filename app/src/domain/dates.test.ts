import { expect, test } from 'vitest';
import { addDays, mondayOf, toDateKey, weekdayName } from './dates';
import { capitalize, normalizeExerciseName } from './text';

test('usa a data local em vez de converter para UTC', () => {
  expect(toDateKey(new Date(2026, 8, 19, 0, 5))).toBe('2026-09-19');
});

test('agrupa domingos na segunda-feira anterior', () => {
  expect(mondayOf('2026-09-20')).toBe('2026-09-14');
  expect(mondayOf('2026-09-16')).toBe('2026-09-14');
  expect(mondayOf('2026-09-14')).toBe('2026-09-14');
});

test('soma dias atravessando mês e ano', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
});

test('nome do dia da semana e capitalização', () => {
  expect(weekdayName('2026-10-04')).toBe('domingo');
  expect(capitalize(weekdayName('2026-10-05'))).toBe('Segunda-feira');
  expect(capitalize('')).toBe('');
});

test('normaliza acentos e espaços ao comparar exercícios', () => {
  expect(normalizeExerciseName('  Elevação   Lateral ')).toBe('elevacao lateral');
  expect(normalizeExerciseName(undefined)).toBe('');
});
