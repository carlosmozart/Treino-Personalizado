// Z7: estoque do frasco.
import { describe, expect, it } from 'vitest';
import { itemStock, setStock, stockText, stockUnit } from './protocol-stock';
import { logDose, saveProtocol } from './protocol';
import { sampleData } from './testing';
import type { AppData, Protocol, ProtocolItem } from './model';

const NOW = new Date(2026, 10, 23, 9); // segunda, 23 nov
const TODAY = '2026-11-23';
const item = (over: Partial<ProtocolItem> = {}): ProtocolItem => ({
  id: 'i1', name: 'Substância A', category: 'hormonio', route: 'im', dose: 100, unit: 'mg', schedule: { every: 7 }, perMl: 250, ...over
});
const protocol = (over: Partial<Protocol> = {}): Protocol => ({ id: 'p1', name: 'P', kind: 'ciclo', startDate: '2026-11-16', weeks: 12, items: [item()], ...over });
const setup = (p = protocol()) => saveProtocol(sampleData(), p, NOW).data;
const dose = (d: AppData, id: string, date: string, amount = 100, over: Record<string, unknown> = {}) =>
  logDose(d, { id, date, name: 'Substância A', dose: amount, unit: 'mg', route: 'im', protocolId: 'p1', itemId: 'i1', ...over }, NOW, TODAY).data;
const view = (d: AppData) => itemStock(d, d.protocols!.p1!, d.protocols!.p1!.items[0]!, TODAY);

describe('Z7: estoque do frasco', () => {
  it('com concentração, o frasco é medido em ml; sem ela, na unidade da dose', () => {
    expect(stockUnit(item())).toBe('ml');
    expect(stockUnit(item({ perMl: undefined as unknown as number }))).toBe('mg');
    expect(stockUnit(item({ unit: 'comprimido', perMl: undefined as unknown as number }))).toBe('comprimido');
    expect(stockText(6.4, 'ml')).toBe('6,4 ml');
  });

  it('desconta as doses desde que abriu (e as avulsas com o mesmo nome) e conta até quando dá', () => {
    let d = setup();
    d = dose(d, 'a', '2026-11-16'); // antes de abrir: não conta
    d = setStock(d, 'p1', 'i1', { amount: 2, since: '2026-11-20' }, NOW).data;
    expect(d.protocols!.p1!.items[0]!.stock).toEqual({ amount: 2, unit: 'ml', since: '2026-11-20' });
    d = dose(d, 'b', '2026-11-23'); // 0,4 ml
    d = logDose(d, { id: 'c', date: '2026-11-22', name: 'substância a', dose: 50, unit: 'mg', route: 'im' }, NOW, TODAY).data; // avulsa: 0,2 ml
    const v = view(d);
    if (!v || v.stale) throw new Error('sem estoque');
    expect(v.used).toBeCloseTo(0.6);
    expect(v.left).toBeCloseTo(1.4);
    expect(v.perDose).toBeCloseTo(0.4);
    // 1,4 ml dá 3 doses de 0,4: 30 nov, 7 e 14 dez; a de 21 dez já não cabe
    expect(v.applications).toBe(3);
    expect(v.lastCovered).toBe('2026-12-14');
    expect(v.shortOn).toBe('2026-12-21');
    expect(v.enough).toBe(false);
    expect(v.low).toBe(true);
  });

  it('frasco que cobre o protocolo todo; sem nenhuma dose a menos, não avisa', () => {
    let d = setup(protocol({ weeks: 2 }));
    d = setStock(d, 'p1', 'i1', { amount: 10, since: TODAY }, NOW).data;
    const v = view(d);
    if (!v || v.stale) throw new Error('sem estoque');
    expect(v.applications).toBe(25);
    expect(v.enough).toBe(true);
    expect(v.low).toBe(false);
    expect(v.shortOn).toBeUndefined();
  });

  it('comprimidos: conta por unidade, com várias doses por dia', () => {
    let d = setup(protocol({ weeks: undefined as unknown as number, items: [item({ unit: 'comprimido', dose: 1, perMl: undefined as unknown as number, schedule: { every: 1 }, timesPerDay: 2, route: 'oral' })] }));
    d = setStock(d, 'p1', 'i1', { amount: 30, since: TODAY }, NOW).data;
    d = logDose(d, { id: 'x', date: TODAY, name: 'Substância A', dose: 1, unit: 'comprimido', route: 'oral', protocolId: 'p1', itemId: 'i1', slot: 0 }, new Date(2026, 10, 23, 12), TODAY).data;
    const v = view(d);
    if (!v || v.stale) throw new Error('sem estoque');
    expect(v.left).toBe(29);
    expect(v.applications).toBe(29);
    // hoje falta 1 (a 2ª), depois 2 por dia: 1 + 2×14 = 29, cobre até 7 dez
    expect(v.lastCovered).toBe('2026-12-07');
    expect(v.shortOn).toBe('2026-12-08');
    expect(v.low).toBe(false);
  });

  it('mudar a concentração depois de informar o frasco pede para informar de novo; tirar o estoque', () => {
    let d = setStock(setup(), 'p1', 'i1', { amount: 2, since: TODAY }, NOW).data;
    const p = d.protocols!.p1!;
    const { perMl: _c, ...noConc } = p.items[0]!;
    d = saveProtocol(d, { ...p, items: [noConc] }, NOW).data;
    expect(view(d)).toMatchObject({ stale: true });
    d = setStock(d, 'p1', 'i1', null, NOW).data;
    expect(d.protocols!.p1!.items[0]!.stock).toBeUndefined();
    expect(view(d)).toBeNull();
  });

  it('frasco aberto hoje depois da dose de hoje: essa dose veio do frasco anterior', () => {
    let d = dose(setup(), 'hoje', TODAY);
    d = setStock(d, 'p1', 'i1', { amount: 10, since: TODAY }, new Date(2026, 10, 23, 10)).data;
    expect(d.protocols!.p1!.items[0]!.stock!.openedAt).toBe(new Date(2026, 10, 23, 10).toISOString());
    expect(view(d)).toMatchObject({ left: 10, applications: 25 });
    // a registrada depois de abrir sai deste
    d = logDose(d, { id: 'depois', date: TODAY, name: 'Substância A', dose: 100, unit: 'mg', route: 'im' }, new Date(2026, 10, 23, 11), TODAY).data;
    expect(view(d)).toMatchObject({ left: 9.6 });
  });

  it('quantidade inválida ou substância que não existe: nada muda', () => {
    const d = setup();
    expect(setStock(d, 'p1', 'i1', { amount: 0, since: TODAY }, NOW).data).toBe(d);
    expect(setStock(d, 'p1', 'i1', { amount: 5, since: 'ontem' }, NOW).data).toBe(d);
    expect(setStock(d, 'p1', 'nada', { amount: 5, since: TODAY }, NOW).data).toBe(d);
  });
});
