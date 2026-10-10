import { expect, test } from 'vitest';
import { searchNames, searchPool } from './search';

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

test('o que você já fez vem primeiro, sem passar um acerto por um erro de digitação', () => {
  const names = ['Rosca Direta (Barra)', 'Rosca Martelo (Halteres)', 'Rosca Scott (Máquina)'];
  expect(searchNames('rosca', names)[0]).toBe('Rosca Direta (Barra)');
  expect(searchNames('rosca', names, 6, new Set(['rosca scott (maquina)']))[0]).toBe('Rosca Scott (Máquina)');
  // "supino" exato vence "suplino" feito antes
  expect(searchNames('supino', ['Supino Reto', 'Suplino Inventado'], 6, new Set(['suplino inventado']))[0]).toBe('Supino Reto');
});

test('nomes digitados à mão no histórico entram na busca', () => {
  const pool = searchPool(['Supino Reto (Barra)'], [{ entries: [{ key: 'remada do joao', name: 'Remada do João' }, { key: 'supino reto (barra)', name: 'Supino Reto (Barra)' }] }]);
  expect(pool.names).toEqual(['Supino Reto (Barra)', 'Remada do João']);
  expect(searchNames('remada', pool.names, 6, pool.done)).toEqual(['Remada do João']);
});

test('favoritos na frente dos já feitos (M26)', () => {
  const names = ['Rosca Direta (Barra)', 'Rosca Martelo (Halteres)', 'Rosca Scott (Máquina)'];
  const done = new Set(['rosca direta (barra)']);
  const fav = new Set(['rosca martelo (halteres)']);
  expect(searchNames('rosca', names, 6, done, fav)[0]).toBe('Rosca Martelo (Halteres)');
  expect(searchNames('rosca', names, 6, done, fav)[1]).toBe('Rosca Direta (Barra)');
});
