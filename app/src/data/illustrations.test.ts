import { expect, test } from 'vitest';
import { illustrationIdFor, loadIllustration } from './illustrations';
import { EXERCISE_LIBRARY } from './exercise-library';
import { ILLUSTRATION_BY_NAME } from './illustration-map';
import { seedPlan } from './seed-plan';

test('encontra pelo nome exato, sem acento/caixa e pelo nome sem o complemento', () => {
  expect(illustrationIdFor('Supino Reto (Barra)')).toBe('0042');
  expect(illustrationIdFor('  supino reto (barra) ')).toBe('0042');
  expect(illustrationIdFor('Leg Press 45º (Amplitude Total)')).toBe('0127');
  expect(illustrationIdFor('Supino Reto')).toBe('0042');
  expect(illustrationIdFor('Esteira')).toBeNull();
  expect(illustrationIdFor('Peck Deck (Voador)')).toBe('0047');
  expect(illustrationIdFor('Puxada Frontal (Polia)')).toBeNull();
});

test('toda entrada da tabela tem os dois arquivos, e cobre a maior parte da biblioteca e do plano de exemplo', async () => {
  for (const id of new Set(Object.values(ILLUSTRATION_BY_NAME))) {
    const frames = await loadIllustration(id);
    expect(frames?.start).toMatch(/^<svg [^>]*fill="currentColor"/);
    expect(frames?.end).toMatch(/^<svg /);
    expect(frames!.start).not.toMatch(/<script|on\w+=|href/i);
  }
  const library = Object.entries(EXERCISE_LIBRARY).filter(([g]) => g !== 'Cardio').flatMap(([, names]) => names);
  const covered = library.filter(n => illustrationIdFor(n)).length;
  expect(covered / library.length).toBeGreaterThan(0.7);
  const seed = Object.values(seedPlan('2026-10-04').days).flatMap(d => d.exercises.map(e => e.name));
  // lacunas conhecidas (illustration-map.ts): sem imagem fiel no Everkinetic
  expect(new Set(seed.filter(n => !illustrationIdFor(n)))).toEqual(new Set([
    'Puxada Frontal (Polia)', 'Elevação Pélvica (Hip Thrust)', 'Abdominal (Prancha ou Máquina)'
  ]));
}, 20_000); // carrega os 270 arquivos (135 ilustrações): com a máquina ocupada, 5 s ficavam apertados

test('biblioteca sem nomes repetidos, e os exercícios do Q9 (fim de cada grupo) todos com ilustração', () => {
  const all = Object.values(EXERCISE_LIBRARY).flat();
  expect(new Set(all.map(n => n.toLowerCase())).size).toBe(all.length);
  expect(all.length).toBe(153);
  for (const n of ['Supino Declinado (Barra)', 'Remada Alta (Halteres)', 'Rosca Zottman', 'Agachamento Frontal (Barra)', 'Prancha Lateral']) {
    expect(ILLUSTRATION_BY_NAME[n]).toMatch(/^\d{4}$/);
  }
});
