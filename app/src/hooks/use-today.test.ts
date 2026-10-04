import { expect, test } from 'vitest';
import { checkDayChange, useToday } from './use-today';

test('muda o dia só quando a data muda', () => {
  useToday.setState({ today: '2026-10-07' });
  expect(checkDayChange(new Date(2026, 9, 7, 23, 59))).toBe(false);
  expect(checkDayChange(new Date(2026, 9, 8, 0, 1))).toBe(true);
  expect(useToday.getState().today).toBe('2026-10-08');
});
