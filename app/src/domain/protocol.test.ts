// Z1: protocolo de hormônios, peptídeos e medicamentos (só registro).
import { describe, expect, it } from 'vitest';
import {
  addHealthEntry, adherence, backfillDoses, canReopen, clearProtocolData, deleteDose, deleteProtocol, doctorSummary, doseText, dosesDue, endProtocol, examMarkers,
  isDue, logDose, missedDoses, nextSite, pressureHigh, protocolStatus, pendingBefore, recentSymptoms, reopenProtocol, saveProtocol, scheduleText, upcomingDoses, weeklyAmount
} from './protocol';
import { isAppData } from './backup';
import { mergeAppData } from './sync';
import { sampleData } from './testing';
import type { AppData, Protocol, ProtocolItem } from './model';

const NOW = new Date(2026, 10, 17, 10);
const item = (over: Partial<ProtocolItem> = {}): ProtocolItem => ({
  id: 'i1', name: 'Substância A', category: 'hormonio', route: 'im', dose: 100, unit: 'mg', schedule: { every: 7 }, ...over
});
const protocol = (over: Partial<Protocol> = {}): Protocol => ({
  id: 'p1', name: 'Protocolo teste', kind: 'ciclo', startDate: '2026-11-02', weeks: 4, items: [item()], ...over
});
const withProtocol = (p = protocol()): AppData => saveProtocol(sampleData(), p, NOW).data;

describe('Z1: agenda do protocolo', () => {
  it('a cada 7 dias conta do primeiro dia; dias fixos seguem a semana', () => {
    const p = protocol();
    expect(isDue(p, p.items[0]!, '2026-11-02')).toBe(true);
    expect(isDue(p, p.items[0]!, '2026-11-05')).toBe(false);
    expect(isDue(p, p.items[0]!, '2026-11-09')).toBe(true);
    // 4 semanas: 2 a 29 nov; dia 30 já não tem
    expect(isDue(p, p.items[0]!, '2026-11-30')).toBe(false);
    const twice = item({ schedule: { weekdays: ['SEG', 'QUI'] } });
    expect(isDue(p, twice, '2026-11-05')).toBe(true); // quinta
    expect(isDue(p, twice, '2026-11-06')).toBe(false);
    expect(weeklyAmount(twice)).toBe(200);
    expect(weeklyAmount(item({ schedule: { every: 2 } }))).toBe(350);
  });

  it('substância só em parte das semanas', () => {
    const p = protocol({ weeks: 8, items: [item({ fromWeek: 3, toWeek: 4, schedule: { every: 1 } })] });
    expect(isDue(p, p.items[0]!, '2026-11-15')).toBe(false); // semana 2
    expect(isDue(p, p.items[0]!, '2026-11-16')).toBe(true); // semana 3
    expect(isDue(p, p.items[0]!, '2026-11-29')).toBe(true); // fim da semana 4
    expect(isDue(p, p.items[0]!, '2026-11-30')).toBe(false);
  });

  it('contínuo (sem semanas) não acaba, e encerrar para a agenda', () => {
    const p = protocol({ weeks: undefined as unknown as number });
    delete p.weeks;
    let d = withProtocol(p);
    expect(protocolStatus(p, '2027-03-01')).toMatchObject({ ended: false, totalWeeks: null, daysLeft: null });
    expect(dosesDue(d, '2027-03-01')).toHaveLength(1);
    d = endProtocol(d, 'p1', '2026-11-17', NOW).data;
    expect(dosesDue(d, '2026-11-23')).toHaveLength(0);
    expect(protocolStatus(d.protocols!.p1!, '2026-11-20').ended).toBe(true);
  });

  it('situação: semana atual, quantos dias faltam', () => {
    expect(protocolStatus(protocol(), '2026-11-17')).toMatchObject({ week: 3, totalWeeks: 4, ended: false, daysLeft: 12, end: '2026-11-29' });
    expect(protocolStatus(protocol({ startDate: '2026-12-01' }), '2026-11-17')).toMatchObject({ future: true, week: 0 });
  });

  it('textos: dose e frequência', () => {
    expect(doseText(0.5, 'ml')).toBe('0,5 ml');
    expect(doseText(1, 'comprimido')).toBe('1 comprimido');
    expect(doseText(2, 'gota')).toBe('2 gotas');
    expect(scheduleText({ every: 1 })).toBe('todo dia');
    expect(scheduleText({ weekdays: ['QUI', 'SEG'] })).toBe('segunda e quinta');
  });
});

describe('Z1: doses registradas', () => {
  it('registrar a dose do dia marca como feita, uma vez só, e conta na adesão', () => {
    let d = withProtocol();
    const input = { id: 'd1', date: '2026-11-16', name: 'Substância A', dose: 100, unit: 'mg' as const, route: 'im' as const, protocolId: 'p1', itemId: 'i1', site: 'gluteo-e' as const };
    d = logDose(d, input, NOW, '2026-11-17').data;
    expect(dosesDue(d, '2026-11-16')[0]!.taken?.id).toBe('d1');
    // a mesma dose de novo: nada muda
    expect(logDose(d, { ...input, id: 'd2' }, NOW, '2026-11-17').data).toBe(d);
    // data futura: nada muda
    expect(logDose(d, { ...input, id: 'd3', date: '2026-11-23' }, NOW, '2026-11-17').data).toBe(d);
    expect(adherence(d, d.protocols!.p1!, '2026-11-17')).toEqual({ due: 3, taken: 1 });
    expect(missedDoses(d, '2026-11-17', 10).map(x => x.date)).toEqual(['2026-11-09']);
    expect(upcomingDoses(d, '2026-11-17').map(x => x.date)).toEqual(['2026-11-23']);
    d = deleteDose(d, 'd1', NOW).data;
    expect(d.doses).toBeUndefined();
    expect(d.sync.deleted['dose:d1']).toBeDefined();
  });

  it('o local da aplicação alterna', () => {
    let d = withProtocol();
    expect(nextSite(d, 'im')).toBe('gluteo-e');
    d = logDose(d, { id: 'd1', date: '2026-11-16', name: 'A', dose: 1, unit: 'ml', route: 'im', site: 'gluteo-e' }, NOW, '2026-11-17').data;
    expect(nextSite(d, 'im')).toBe('gluteo-d');
    expect(nextSite(d, 'oral')).toBeUndefined();
    // oral não guarda local
    d = logDose(d, { id: 'd2', date: '2026-11-16', name: 'B', dose: 1, unit: 'comprimido', route: 'oral', site: 'coxa-e' }, NOW, '2026-11-17').data;
    expect(d.doses!.d2!.site).toBeUndefined();
  });

  it('apagar o protocolo deixa as doses no diário', () => {
    let d = withProtocol();
    d = logDose(d, { id: 'd1', date: '2026-11-16', name: 'A', dose: 100, unit: 'mg', route: 'im', protocolId: 'p1', itemId: 'i1' }, NOW, '2026-11-17').data;
    d = deleteProtocol(d, 'p1', NOW).data;
    expect(d.protocols).toBeUndefined();
    expect(d.doses?.d1).toBeDefined();
  });

  it('protocolo inválido não é salvo', () => {
    const base = sampleData();
    expect(saveProtocol(base, protocol({ name: '  ' }), NOW).data).toBe(base);
    expect(saveProtocol(base, protocol({ items: [] }), NOW).data).toBe(base);
    expect(saveProtocol(base, protocol({ items: [item({ dose: 0 })] }), NOW).data).toBe(base);
    expect(saveProtocol(base, protocol({ items: [item({ schedule: { weekdays: [] } })] }), NOW).data).toBe(base);
    expect(saveProtocol(base, protocol({ items: [item({ fromWeek: 3, toWeek: 2 })] }), NOW).data).toBe(base);
  });
});

describe('Z1: diário de saúde', () => {
  it('sintomas, pressão e exames, com o valor anterior de cada marcador', () => {
    let d = sampleData();
    d = addHealthEntry(d, { id: 'h1', date: '2026-10-01', kind: 'exame', exam: [{ name: 'Hematócrito', value: 45, unit: '%' }] }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h2', date: '2026-11-10', kind: 'exame', exam: [{ name: 'Hematócrito', value: 49.5, unit: '%' }, { name: 'Estradiol', value: 40, unit: 'pg/mL' }] }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h3', date: '2026-11-12', kind: 'pressao', pressure: { sys: 142, dia: 88, pulse: 70 } }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h4', date: '2026-11-13', kind: 'sintomas', symptoms: ['Acne', 'Insônia'], text: 'dormi mal' }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h5', date: '2026-11-14', kind: 'sintomas', symptoms: ['Acne'] }, NOW, '2026-11-17').data;
    const hct = examMarkers(d).find(m => m.name === 'Hematócrito')!;
    expect(hct.last).toEqual({ date: '2026-11-10', value: 49.5 });
    expect(hct.previous).toEqual({ date: '2026-10-01', value: 45 });
    expect(pressureHigh(d.healthLog!.h3!.pressure!)).toBe(true);
    expect(recentSymptoms(d, '2026-11-17')).toEqual([{ name: 'Acne', count: 2 }, { name: 'Insônia', count: 1 }]);
    // pressão impossível ou registro vazio: nada muda
    expect(addHealthEntry(d, { id: 'x', date: '2026-11-17', kind: 'pressao', pressure: { sys: 80, dia: 120 } }, NOW, '2026-11-17').data).toBe(d);
    expect(addHealthEntry(d, { id: 'y', date: '2026-11-17', kind: 'nota', text: '  ' }, NOW, '2026-11-17').data).toBe(d);
  });

  it('o resumo para a consulta traz protocolo, adesão, exames, pressão e sintomas', () => {
    let d = withProtocol();
    d = logDose(d, { id: 'd1', date: '2026-11-02', name: 'Substância A', dose: 100, unit: 'mg', route: 'im', protocolId: 'p1', itemId: 'i1' }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h1', date: '2026-11-10', kind: 'exame', exam: [{ name: 'Hematócrito', value: 49, unit: '%' }] }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h2', date: '2026-11-12', kind: 'pressao', pressure: { sys: 130, dia: 85 } }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h3', date: '2026-11-13', kind: 'sintomas', symptoms: ['Acne'] }, NOW, '2026-11-17').data;
    const text = doctorSummary(d, '2026-11-17');
    expect(text).toContain('Protocolo teste (ciclo, desde 2 nov 2026, semana 3 de 4)');
    expect(text).toContain('- Substância A: 100 mg a cada 7 dias, intramuscular');
    expect(text).toContain('Doses registradas: 1 de 3 previstas');
    expect(text).toContain('- Hematócrito: 49 % em 10 nov 2026');
    expect(text).toContain('- 12 nov 2026: 130/85 mmHg');
    expect(text).toContain('SINTOMAS (30 DIAS): acne (1x)');
  });
});

describe('Z1: dados entre aparelhos e no backup', () => {
  it('doses de dois aparelhos juntam, e apagar tudo não volta na junção', () => {
    const base = withProtocol();
    const phone = logDose(base, { id: 'a', date: '2026-11-16', name: 'A', dose: 1, unit: 'ml', route: 'im' }, NOW, '2026-11-17').data;
    const tablet = addHealthEntry(base, { id: 'h', date: '2026-11-16', kind: 'nota', text: 'ok' }, NOW, '2026-11-17').data;
    const merged = mergeAppData(phone, tablet);
    expect(Object.keys(merged.doses!)).toEqual(['a']);
    expect(Object.keys(merged.healthLog!)).toEqual(['h']);
    expect(merged.protocols?.p1).toBeDefined();
    const cleared = clearProtocolData(merged, new Date(2026, 10, 17, 11)).data;
    const again = mergeAppData(cleared, merged);
    expect(again.protocols).toBeUndefined();
    expect(again.doses).toBeUndefined();
    expect(again.healthLog).toBeUndefined();
  });

  it('o backup com protocolo é aceito; com formato estragado, recusado', () => {
    let d = withProtocol(protocol({ items: [item({ schedule: { weekdays: ['SEG'] } })] }));
    d = logDose(d, { id: 'a', date: '2026-11-16', name: 'A', dose: 1, unit: 'ml', route: 'im' }, NOW, '2026-11-17').data;
    d = addHealthEntry(d, { id: 'h', date: '2026-11-16', kind: 'exame', exam: [{ name: 'LH', value: 1, unit: 'mUI/mL' }] }, NOW, '2026-11-17').data;
    expect(isAppData(JSON.parse(JSON.stringify(d)))).toBe(true);
    expect(isAppData({ ...d, doses: { a: { id: 'a', date: 'ontem', name: 'A', dose: 1, unit: 'ml' } } })).toBe(false);
    expect(isAppData({ ...d, protocols: { p1: { ...d.protocols!.p1!, items: [{ ...item(), schedule: {} }] } } })).toBe(false);
  });
});

describe('Z1: acertos de encerrar, reabrir e doses anteriores', () => {
  it('protocolo que ainda não começou não se encerra', () => {
    const d = withProtocol(protocol({ startDate: '2026-12-01' }));
    expect(endProtocol(d, 'p1', '2026-11-17', NOW).data).toBe(d);
  });

  it('encerrar e reabrir; depois do fim previsto não dá para reabrir', () => {
    let d = endProtocol(withProtocol(), 'p1', '2026-11-17', NOW).data;
    expect(d.protocols!.p1!.endedOn).toBe('2026-11-17');
    expect(canReopen(d.protocols!.p1!, '2026-11-20')).toBe(true);
    d = reopenProtocol(d, 'p1', '2026-11-20', NOW).data;
    expect(d.protocols!.p1!.endedOn).toBeUndefined();
    expect(dosesDue(d, '2026-11-23')).toHaveLength(1);
    // as 4 semanas acabam em 29 nov: encerrado, em dezembro já não reabre
    const ended = endProtocol(withProtocol(), 'p1', '2026-11-17', NOW).data;
    expect(canReopen(ended.protocols!.p1!, '2026-12-05')).toBe(false);
    expect(reopenProtocol(ended, 'p1', '2026-12-05', NOW).data).toBe(ended);
  });

  it('quem já está no protocolo marca as doses de antes de hoje de uma vez (hoje fica para registrar)', () => {
    let d = withProtocol(protocol({ items: [item(), item({ id: 'i2', name: 'B', route: 'oral', schedule: { weekdays: ['SEG', 'QUI'] } })] }));
    // a de 9 nov já registrada à mão
    d = logDose(d, { id: 'm', date: '2026-11-09', name: 'Substância A', dose: 120, unit: 'mg', route: 'im', protocolId: 'p1', itemId: 'i1' }, NOW, '2026-11-17').data;
    const p = d.protocols!.p1!;
    // A: 2 nov e 16 nov (9 nov já tem); B: 2, 5, 9, 12, 16 nov (antes do dia 17)
    expect(pendingBefore(d, p, '2026-11-17')).toBe(7);
    const filled = backfillDoses(d, 'p1', '2026-11-17', NOW).data;
    expect(adherence(filled, p, '2026-11-17')).toEqual({ due: 8, taken: 8 });
    expect(filled.doses!.m!.dose).toBe(120);
    expect(pendingBefore(filled, p, '2026-11-17')).toBe(0);
    expect(backfillDoses(filled, 'p1', '2026-11-17', NOW).data).toBe(filled);
    // o mesmo id nos dois aparelhos: juntar não duplica
    const merged = mergeAppData(filled, backfillDoses(d, 'p1', '2026-11-17', new Date(2026, 10, 17, 11)).data);
    expect(Object.keys(merged.doses!)).toHaveLength(8);
  });

  it('backup com dose sem a hora é recusado', () => {
    const d = logDose(withProtocol(), { id: 'a', date: '2026-11-16', name: 'A', dose: 1, unit: 'ml', route: 'im' }, NOW, '2026-11-17').data;
    const { at: _at, ...noTime } = d.doses!.a!;
    expect(isAppData({ ...d, doses: { a: noTime } })).toBe(false);
  });
});
