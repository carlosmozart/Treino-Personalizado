import { expect, test } from 'vitest';
import { searchNames } from './search';

const NAMES = ['Supino Reto (Barra)', 'Supino Inclinado (Halteres)', 'Rosca Direta (Barra)', 'Rosca Martelo (Halteres)', 'Elevação Lateral (Halteres)', 'Agachamento Livre', 'Stiff (Halteres/Barra)'];

test('busca tolerante (S6)', () => {
  expect(searchNames('supino', NAMES)[0]).toMatch(/^Supino/);
  expect(searchNames('suplino', NAMES)).toContain('Supino Reto (Barra)');      // erro de digitação
  expect(searchNames('elevacao', NAMES)).toEqual(['Elevação Lateral (Halteres)']); // sem acento
  expect(searchNames('roscas', NAMES)).toHaveLength(2);                           // plural
  expect(searchNames('rosca db', NAMES)).toEqual(['Rosca Martelo (Halteres)']);   // abreviação
  expect(searchNames('agachamneto', NAMES)).toEqual(['Agachamento Livre']);
  expect(searchNames('xyz', NAMES)).toEqual([]);
  expect(searchNames('', NAMES)).toEqual([]);
});
