// T7: tipos de barra na calculadora de anilhas.
import { describe, expect, it } from 'vitest';
import { barFor, barKg, barKindFor, guessBar, plateLoad, setBarKg, setExerciseBar } from './plates';
import { warmupConfig } from './warmup';

describe('T7: barra de cada exercício', () => {
  it('adivinha pelo nome: W, hexagonal ou olímpica', () => {
    expect(guessBar('Rosca Direta (Barra W)')).toBe('w');
    expect(guessBar('Levantamento Terra (Barra Hexagonal)')).toBe('hex');
    expect(guessBar('Supino Reto (Barra)')).toBe('olimpica');
    expect(guessBar('Remada Curvada (Barra)')).toBe('olimpica');
  });

  it('cada tipo tem o seu peso; a olímpica continua sendo o "Peso da barra" de sempre', () => {
    expect(barKg('olimpica', {})).toBe(20);
    expect(barKg('olimpica', { barWeight: 18 })).toBe(18);
    expect(barKg('feminina', {})).toBe(15);
    expect(barKg('w', { barWeights: { w: 8 } })).toBe(8);
    expect(barFor('Rosca Scott (Barra W)', { barWeights: { w: 8 } })).toBe(8);
  });

  it('a escolha fica guardada para o exercício; voltar à do nome apaga a escolha', () => {
    const chosen = setExerciseBar({}, 'Supino Reto (Barra)', 'feminina');
    expect(chosen).toEqual({ exerciseBars: { 'supino reto (barra)': 'feminina' } });
    expect(barKindFor('Supino Reto (Barra)', chosen)).toBe('feminina');
    expect(barFor('Supino Reto (Barra)', chosen)).toBe(15);
    expect(setExerciseBar(chosen, 'Supino Reto (Barra)', 'olimpica')).toEqual({ exerciseBars: {} });
  });

  it('mudar o peso de um tipo não mexe nos outros; limite de 0 a 50 kg', () => {
    expect(setBarKg({ barWeights: { hex: 22 } }, 'w', 7.5)).toEqual({ barWeights: { hex: 22, w: 7.5 } });
    expect(setBarKg({}, 'olimpica', 80)).toEqual({ barWeight: 50 });
  });

  it('a conta das anilhas e o aquecimento usam a barra do exercício', () => {
    const settings = { barWeights: { w: 10 }, plates: [10, 5, 2.5, 1.25] };
    expect(plateLoad(30, barFor('Rosca Direta (Barra W)', settings), settings.plates)).toEqual({ kind: 'plates', perSide: [10], missing: 0 });
    expect(warmupConfig('Rosca Direta (Barra W)', settings).bar).toBe(10);
    expect(warmupConfig('Supino Reto (Barra)', settings).bar).toBe(20);
  });
});
