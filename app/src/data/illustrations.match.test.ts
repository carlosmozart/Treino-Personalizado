import { expect, test } from 'vitest';
import { illustrationIdFor } from './illustrations';
import { ILLUSTRATION_BY_NAME as MAP } from './illustration-map';

test('Q5: nome livre ganha a ilustração do exercício com as mesmas palavras', () => {
  expect(illustrationIdFor('Supino reto com halteres')).toBe(MAP['Supino Reto (Halteres)']);
  expect(illustrationIdFor('supino inclinado com halter')).toBe(MAP['Supino Inclinado (Halteres)']);
  expect(illustrationIdFor('Rosca direta com barra W')).toBe(MAP['Rosca Direta (Barra W)']);
  expect(illustrationIdFor('Remada curvada')).toBe(MAP['Remada Curvada (Barra)']);
  expect(illustrationIdFor('Leg press')).toBe(MAP['Leg Press 45º (Amplitude Parcial)']);
  expect(illustrationIdFor('Rosca direta na polia')).toBe(MAP['Rosca Direta (Polia Baixa)']);
});

test('Q5: outro movimento, outro equipamento ou nome vago ficam sem ilustração', () => {
  // alternada + inclinada não é nenhuma das duas; "baixa" e "polia" mudam o exercício
  expect(illustrationIdFor('Rosca alternada inclinada')).toBeNull();
  expect(illustrationIdFor('Crossover polia baixa')).toBeNull();
  expect(illustrationIdFor('Elevação lateral na polia')).toBeNull();
  expect(illustrationIdFor('Supino reto na máquina')).toBeNull();
  expect(illustrationIdFor('Agachamento')).toBeNull();
  // nomes da biblioteca sem desenho ficaram assim de propósito
  expect(illustrationIdFor('Remada Unilateral (Halter)')).toBeNull();
  expect(illustrationIdFor('Agachamento Búlgaro')).toBeNull();
});
