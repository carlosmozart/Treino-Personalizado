// Z2: curva estimada com a meia-vida informada pela pessoa.
import { describe, expect, it } from 'vitest';
import { amountAt, estimateCurve, halfLifeText } from './protocol-curve';
import { logDose, saveProtocol } from './protocol';
import { sampleData } from './testing';
import type { Protocol, ProtocolItem } from './model';

const H = 3_600_000;
const item = (over: Partial<ProtocolItem> = {}): ProtocolItem => ({
  id: 'i1', name: 'A', category: 'hormonio', route: 'im', dose: 100, unit: 'mg', schedule: { every: 7 }, halfLifeHours: 7 * 24, ...over
});
const protocol = (over: Partial<Protocol> = {}): Protocol => ({ id: 'p1', name: 'P', kind: 'ciclo', startDate: '2026-09-07', weeks: 12, items: [item()], ...over });

describe('Z2: curva estimada', () => {
  it('uma dose cai pela metade a cada meia-vida', () => {
    const doses = [{ t: 0, amount: 100 }];
    expect(amountAt(doses, 0, 24)).toBe(100);
    expect(amountAt(doses, 24 * H, 24)).toBeCloseTo(50);
    expect(amountAt(doses, 48 * H, 24)).toBeCloseTo(25);
    expect(amountAt(doses, -1, 24)).toBe(0);
  });

  it('dose semanal com meia-vida de 7 dias acumula até perto do dobro, e cai depois do fim', () => {
    const p = protocol();
    const curve = estimateCurve({}, p, p.items[0]!, 'plan', new Date(2026, 10, 17, 10))!;
    expect(curve.doses).toBe(12);
    expect(curve.weeks[0]!.max).toBeCloseTo(100);
    // a semana 1 conta da primeira dose: o menor valor não é zero
    expect(curve.weeks[0]!.min).toBeGreaterThan(50);
    // pico da semana 12: 100 × (1 − 0,5^12) / (1 − 0,5) ≈ 199,95
    expect(curve.weeks.find(w => w.week === 12)!.max).toBeCloseTo(199.95, 1);
    expect(curve.max).toBeCloseTo(199.95, 1);
    // depois do fim (8 semanas de cauda no máximo; 5 meias-vidas = 35 dias) só desce
    const after = curve.points.filter(pt => pt.t > curve.lastDose!);
    expect(after.every((pt, i) => i === 0 || pt.value <= after[i - 1]!.value)).toBe(true);
    expect(after.at(-1)!.value).toBeLessThan(curve.max / 16);
    expect(curve.steadyWeeks).toBe(5);
    expect(curve.now).not.toBeNull();
  });

  it('com as registradas, valem a data e a dose de verdade (e o que faltou fica de fora)', () => {
    const p = protocol({ startDate: '2026-11-02', weeks: 4 });
    let d = saveProtocol(sampleData(), p, new Date(2026, 10, 2)).data;
    // só a primeira foi registrada, com 150 em vez de 100; a de 9 nov faltou
    d = logDose(d, { id: 'x', date: '2026-11-02', name: 'A', dose: 150, unit: 'mg', route: 'im', protocolId: 'p1', itemId: 'i1' }, new Date(2026, 10, 2, 8), '2026-11-02').data;
    const now = new Date(2026, 10, 12, 10);
    const logged = estimateCurve(d, p, p.items[0]!, 'logged', now)!;
    const plan = estimateCurve(d, p, p.items[0]!, 'plan', now)!;
    expect(plan.doses).toBe(4);
    expect(logged.doses).toBe(3); // 2 nov registrada + 16 e 23 nov previstas
    expect(logged.weeks[0]!.max).toBeCloseTo(150);
    expect(logged.weeks[1]!.max).toBeLessThan(plan.weeks[1]!.max);
  });

  it('sem meia-vida não há curva', () => {
    const p = protocol({ items: [item({ halfLifeHours: undefined as unknown as number })] });
    delete p.items[0]!.halfLifeHours;
    expect(estimateCurve({}, p, p.items[0]!, 'plan', new Date(2026, 10, 17))).toBeNull();
  });

  it('contínuo começado há anos mostra só os últimos meses e as próximas semanas', () => {
    const p = protocol({ startDate: '2023-01-02' });
    delete p.weeks;
    const curve = estimateCurve({}, p, p.items[0]!, 'plan', new Date(2026, 10, 17, 10))!;
    const days = (curve.points.at(-1)!.t - curve.points[0]!.t) / (24 * H);
    expect(days).toBeLessThan(182 + 56 + 36 + 2);
    expect(curve.points.length).toBeLessThan(500);
    // já estável: o vale fica perto de 100 e o pico perto de 200, e não despenca no fim
    expect(curve.max).toBeCloseTo(200, 0);
    expect(curve.points.at(-1)!.value).toBeGreaterThan(90);
  });

  it('meia-vida em texto', () => {
    expect(halfLifeText(8)).toBe('8 h');
    expect(halfLifeText(36)).toBe('36 h');
    expect(halfLifeText(108)).toBe('4,5 dias');
  });
});
