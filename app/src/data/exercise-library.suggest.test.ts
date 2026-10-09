import { expect, test } from 'vitest';
import { groupOf, guessGroup, sameGroupSuggestions } from './exercise-library';

test('troca sugere o mesmo grupo, com o mesmo equipamento primeiro (S3)', () => {
  const s = sameGroupSuggestions('Supino Reto (Halteres)');
  expect(s.length).toBeGreaterThan(0);
  expect(s.every(n => groupOf(n) === 'Peito')).toBe(true);
  expect(s).not.toContain('Supino Reto (Halteres)');
  expect(s[0]).toMatch(/Halteres/);
  expect(sameGroupSuggestions('Supino Reto (Halteres)', ['Supino Inclinado (Halteres)'])).not.toContain('Supino Inclinado (Halteres)');
  expect(sameGroupSuggestions('Nome que não existe')).toEqual([]);
});

test('nome fora da biblioteca: grupo pela primeira palavra', () => {
  expect(guessGroup('Remada Cavalinho ou Máquina')).toBe('Costas');
  expect(sameGroupSuggestions('Remada Cavalinho ou Máquina').every(n => groupOf(n) === 'Costas')).toBe(true);
  expect(guessGroup('Xyz qualquer')).toBeNull();
});
