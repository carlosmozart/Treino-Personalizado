import { describe, expect, it } from 'vitest';
import { DEFAULT_PLATES, isBarbell, plateLoad } from './plates';

describe('anilhas (M14)', () => {
  it('60 kg na barra de 20: 20 por lado', () => {
    expect(plateLoad(60, 20, DEFAULT_PLATES)).toEqual({ kind: 'plates', perSide: [20], missing: 0 });
  });
  it('combina das maiores para as menores', () => {
    expect(plateLoad(102.5, 20, DEFAULT_PLATES)).toEqual({ kind: 'plates', perSide: [25, 15, 1.25], missing: 0 });
  });
  it('sem a anilha certa, diz quanto falta por lado', () => {
    expect(plateLoad(41, 20, DEFAULT_PLATES)).toEqual({ kind: 'plates', perSide: [10], missing: 0.5 });
  });
  it('só a barra e abaixo da barra', () => {
    expect(plateLoad(20, 20, DEFAULT_PLATES)).toEqual({ kind: 'empty' });
    expect(plateLoad(15, 20, DEFAULT_PLATES)).toEqual({ kind: 'below-bar' });
  });
  it('respeita as anilhas que a academia tem', () => {
    expect(plateLoad(60, 20, [10, 5])).toEqual({ kind: 'plates', perSide: [10, 10], missing: 0 });
  });
  it('reconhece exercícios com barra', () => {
    expect(isBarbell('Supino Reto (Barra)')).toBe(true);
    expect(isBarbell('Agachamento Livre')).toBe(true);
    expect(isBarbell('Barra Fixa (Pull-up)')).toBe(false);
    expect(isBarbell('Supino Reto (Halteres)')).toBe(false);
  });
});
