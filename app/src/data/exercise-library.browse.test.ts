import { expect, test } from 'vitest';
import { addCustomExercise, removeCustomExercise } from '../domain/actions';
import { muscleBalance } from '../domain/stats';
import { sampleData, workout } from '../domain/testing';
import { EQUIPMENT, MUSCLE_GROUPS, equipmentTag, filterLibrary, groupOf, libraryEntries } from './exercise-library';

const NOW = new Date(2026, 9, 21, 12);

test('M46: todo exercício da biblioteca tem um equipamento conhecido, sem cair em "Outros"', () => {
  const entries = libraryEntries();
  expect(entries).toHaveLength(153);
  expect(entries.filter(e => e.equipment === 'Outros').map(e => e.name)).toEqual([]);
  expect(equipmentTag('Rosca Scott (Halteres)')).toBe('Halteres');
  expect(equipmentTag('Supino Reto (Smith)')).toBe('Smith');
  expect(equipmentTag('Barra Fixa Pegada Aberta')).toBe('Peso do corpo');
  expect(equipmentTag('Panturrilha em Pé (Barra)')).toBe('Barra');
  expect(equipmentTag('Esteira')).toBe('Cardio');
  expect(equipmentTag('Meu exercício inventado', 'Peito')).toBe('Outros');
  expect(EQUIPMENT).toContain('Outros');
});

test('M46: filtro por grupo e equipamento; sem busca, favoritos primeiro; com busca, a ordem da busca tolerante', () => {
  const entries = libraryEntries();
  const ombroHalter = filterLibrary(entries, { group: 'Ombro', equipment: 'Halteres' });
  expect(ombroHalter.length).toBeGreaterThan(2);
  expect(ombroHalter.every(e => e.group === 'Ombro' && e.equipment === 'Halteres')).toBe(true);
  const peito = filterLibrary(entries, { group: 'Peito' }, undefined, new Set(['peck deck (voador)']));
  expect(peito[0]!.name).toBe('Peck Deck (Voador)');
  expect(filterLibrary(entries, { query: 'rosca scot' })[0]!.name).toMatch(/^Rosca Scott/);
  expect(filterLibrary(entries, { query: 'rosca', group: 'Peito' })).toEqual([]);
});

test('M46: exercício próprio entra com o grupo, aparece em "Meus", conta nas séries por grupo e pode ser apagado', () => {
  const existing = (name: string) => groupOf(name) !== null;
  let d = sampleData({ workouts: [workout('2026-10-20', 'Remada no Cabo Unilateral', [[10, 20], [10, 20]])] });
  d = addCustomExercise(d, { name: '  Remada no  Cabo Unilateral ', group: 'Costas' }, NOW, MUSCLE_GROUPS, existing).data;
  expect(d.settings.customExercises).toEqual([{ name: 'Remada no Cabo Unilateral', group: 'Costas' }]);
  expect(groupOf('remada no cabo unilateral', d.settings.customExercises)).toBe('Costas');
  const mine = filterLibrary(libraryEntries(d.settings.customExercises), { mine: true });
  expect(mine).toEqual([{ name: 'Remada no Cabo Unilateral', group: 'Costas', equipment: 'Polia', custom: true }]);
  expect(muscleBalance(d, NOW, 30)).toEqual([{ group: 'Costas', sets: 2 }]);

  // nome vazio, grupo desconhecido ou nome que já existe não mudam nada
  for (const bad of [{ name: ' ', group: 'Costas' }, { name: 'Outro', group: 'Pescoço' }, { name: 'Supino Reto (Barra)', group: 'Peito' }]) {
    expect(addCustomExercise(d, bad, NOW, MUSCLE_GROUPS, existing).data).toBe(d);
  }
  d = removeCustomExercise(d, 'REMADA NO CABO UNILATERAL', NOW).data;
  expect(d.settings.customExercises).toEqual([]);
});
