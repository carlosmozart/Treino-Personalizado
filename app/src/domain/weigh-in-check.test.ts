// Y1: pesagem fora da curva.
import { describe, expect, it } from 'vitest';
import { weighInJump } from './weigh-in-check';
import { deviceFrom, problemReportUrl } from '../platform/problem-report';

const ins = [{ date: '2026-11-01', weight: 81 }, { date: '2026-11-20', weight: 80 }];

describe('Y1: pesagem fora da curva', () => {
  it('compara com a anterior; mais de 15% pede confirmação', () => {
    expect(weighInJump(ins, '2026-11-25', 18)).toEqual({ ref: { date: '2026-11-20', weight: 80 }, change: (18 - 80) / 80 });
    expect(weighInJump(ins, '2026-11-25', 93)?.change).toBeCloseTo(0.1625, 3);
    expect(weighInJump(ins, '2026-11-25', 92)).toBeNull(); // 15% em cheio passa
    expect(weighInJump(ins, '2026-11-25', 91)).toBeNull();
    expect(weighInJump(ins, '2026-11-25', 70)).toBeNull();
  });
  it('sem anterior, a seguinte; o próprio dia não conta; sem nenhuma, nada', () => {
    expect(weighInJump(ins, '2026-10-01', 60)?.ref.date).toBe('2026-11-01');
    expect(weighInJump([{ date: '2026-11-25', weight: 80 }], '2026-11-25', 40)).toBeNull();
    expect(weighInJump([], '2026-11-25', 40)).toBeNull();
  });
});

describe('Y6: relatar um problema', () => {
  it('o aparelho sai do navegador do Android e do iPhone', () => {
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 17; SM-S926B Build/CP2A.260605.016; wv) AppleWebKit/537.36')).toBe('Android 17 · SM-S926B');
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe('Android 14 · Pixel 8');
    expect(deviceFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)')).toBe('iOS 18.1');
  });
  it('o endereço abre o formulário com versão, aparelho e os últimos erros (cortados)', () => {
    const url = new URL(problemReportUrl('3.37.0', 'Mozilla/5.0 (Linux; Android 17; SM-S926B Build/X; wv)', [{ at: '2026-11-24T01:02:37Z', message: 'Promessa: falhou', detail: 'x'.repeat(5000) }]));
    expect(url.origin + url.pathname).toBe('https://github.com/carlosmozart/Treino-Personalizado/issues/new');
    expect(url.searchParams.get('template')).toBe('problema.yml');
    expect(url.searchParams.get('versao')).toBe('3.37.0');
    expect(url.searchParams.get('aparelho')).toBe('Android 17 · SM-S926B');
    expect(url.searchParams.get('registro')!.length).toBeLessThan(2600);
    expect(new URL(problemReportUrl('3.37.0', 'x')).searchParams.has('registro')).toBe(false);
  });
});
