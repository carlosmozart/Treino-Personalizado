import { expect, test } from 'vitest';
import { groupOf, guessGroup, swapSuggestions } from './exercise-library';

test('nome fora da biblioteca: grupo pela primeira palavra', () => {
  expect(guessGroup('Remada Cavalinho ou Máquina')).toBe('Costas');
  expect(swapSuggestions('Remada Cavalinho ou Máquina', []).names.every(n => groupOf(n) === 'Costas')).toBe(true);
  expect(guessGroup('Xyz qualquer')).toBeNull();
});

test('troca no treino do dia: mesmo movimento primeiro e nada que já está no treino', () => {
  const today = ['Supino Inclinado (Halteres)', 'Crossover (Polia Alta)'];
  const { group, names } = swapSuggestions('Supino Reto (Barra)', today);
  expect(group).toBe('Peito');
  expect(names[0]).toMatch(/^Supino/);
  expect(names).not.toContain('Supino Inclinado (Halteres)');
  expect(names).not.toContain('Crossover (Polia Alta)');
  expect(names.every(n => groupOf(n) === 'Peito')).toBe(true);
});

test('sem grupo conhecido, usa o grupo que mais aparece no treino de hoje', () => {
  const r = swapSuggestions('Xyz inventado', ['Remada Curvada (Barra)', 'Puxada Frontal (Polia)', 'Rosca Direta (Barra)']);
  expect(r.group).toBe('Costas');
  expect(r.names.length).toBeGreaterThan(0);
});

test('na troca, o favorito do grupo vem primeiro', () => {
  const r = swapSuggestions('Supino Reto (Barra)', [], [], 6, new Set(['peck deck (voador)']));
  expect(r.names[0]).toBe('Peck Deck (Voador)');
});
