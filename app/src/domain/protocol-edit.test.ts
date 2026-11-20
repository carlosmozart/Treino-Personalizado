// Z6: corrigir doses e registros do diário; Z5: quando refazer os exames.
import { describe, expect, it } from 'vitest';
import { addHealthEntry, adherence, examSchedule, logDose, saveProtocol, updateDose, updateHealthEntry } from './protocol';
import { DISCREET_EXAM_BODY, doseRemindersFor, EXAM_REMINDER_ID } from './protocol-reminders';
import { updateSettings } from './actions';
import { sampleData } from './testing';
import type { AppData, Protocol } from './model';

const NOW = new Date(2026, 10, 19, 10);
const TODAY = '2026-11-19';
const protocol: Protocol = { id: 'p1', name: 'P', kind: 'ciclo', startDate: '2026-11-02', weeks: 8, items: [{ id: 'i1', name: 'A', category: 'hormonio', route: 'im', dose: 100, unit: 'mg', schedule: { every: 7 } }] };
const base = (): AppData => saveProtocol(sampleData(), protocol, NOW).data;
const dose = (d: AppData, id: string, date: string) =>
  logDose(d, { id, date, name: 'A', dose: 100, unit: 'mg', route: 'im', protocolId: 'p1', itemId: 'i1', site: 'gluteo-e' }, NOW, TODAY).data;

describe('Z6: corrigir uma dose', () => {
  it('muda dose, local, nota e dia, mantendo o item e a hora do registro', () => {
    let d = dose(base(), 'a', '2026-11-08'); // registrada no dia errado
    const at = d.doses!.a!.at;
    const later = new Date(2026, 10, 19, 11);
    d = updateDose(d, 'a', { date: '2026-11-09', dose: 120, unit: 'mg', route: 'im', name: 'A', site: 'coxa-d', note: 'lote novo' }, later, TODAY).data;
    expect(d.doses!.a).toMatchObject({ date: '2026-11-09', dose: 120, site: 'coxa-d', note: 'lote novo', protocolId: 'p1', itemId: 'i1', at });
    expect(d.sync.changed['dose:a']).toBe(later.toISOString());
    // agora conta como a dose prevista de 9 nov
    expect(adherence(d, d.protocols!.p1!, TODAY)).toEqual({ due: 3, taken: 1 });
  });

  it('não deixa duas vezes a mesma dose no mesmo dia, nem data futura ou dose zero', () => {
    let d = dose(dose(base(), 'a', '2026-11-02'), 'b', '2026-11-09');
    const patch = { dose: 100, unit: 'mg' as const, route: 'im' as const, name: 'A' };
    expect(updateDose(d, 'b', { ...patch, date: '2026-11-02' }, NOW, TODAY).data).toBe(d);
    expect(updateDose(d, 'b', { ...patch, date: '2026-11-25' }, NOW, TODAY).data).toBe(d);
    expect(updateDose(d, 'b', { ...patch, date: '2026-11-09', dose: 0 }, NOW, TODAY).data).toBe(d);
    expect(updateDose(d, 'x', { ...patch, date: '2026-11-09' }, NOW, TODAY).data).toBe(d);
    // a dose do protocolo mantém o nome do item; a avulsa pode mudar de nome
    d = updateDose(d, 'b', { ...patch, date: '2026-11-09', name: 'Outro' }, NOW, TODAY).data;
    expect(d.doses!.b!.name).toBe('A');
    d = logDose(d, { id: 'c', date: '2026-11-10', name: 'Avulsa', dose: 1, unit: 'comprimido', route: 'oral' }, NOW, TODAY).data;
    d = updateDose(d, 'c', { date: '2026-11-10', dose: 2, unit: 'comprimido', route: 'oral', name: 'Outra avulsa' }, NOW, TODAY).data;
    expect(d.doses!.c).toMatchObject({ name: 'Outra avulsa', dose: 2 });
  });
});

describe('Z6: corrigir um registro do diário', () => {
  it('pressão e exame; o tipo não muda e valor impossível não salva', () => {
    let d = addHealthEntry(base(), { id: 'h', date: '2026-11-10', kind: 'pressao', pressure: { sys: 150, dia: 95 } }, NOW, TODAY).data;
    d = updateHealthEntry(d, { id: 'h', date: '2026-11-11', kind: 'pressao', pressure: { sys: 130, dia: 85, pulse: 70 } }, NOW, TODAY).data;
    expect(d.healthLog!.h).toEqual({ id: 'h', date: '2026-11-11', kind: 'pressao', pressure: { sys: 130, dia: 85, pulse: 70 } });
    expect(updateHealthEntry(d, { id: 'h', date: '2026-11-11', kind: 'nota', text: 'x' }, NOW, TODAY).data).toBe(d);
    expect(updateHealthEntry(d, { id: 'h', date: '2026-11-11', kind: 'pressao', pressure: { sys: 80, dia: 120 } }, NOW, TODAY).data).toBe(d);
    d = addHealthEntry(d, { id: 'e', date: '2026-11-10', kind: 'exame', exam: [{ name: 'LH', value: 1, unit: 'mUI/mL' }] }, NOW, TODAY).data;
    d = updateHealthEntry(d, { id: 'e', date: '2026-11-10', kind: 'exame', exam: [{ name: 'LH', value: 1.5, unit: 'mUI/mL' }, { name: 'FSH', value: 2, unit: 'mUI/mL' }] }, NOW, TODAY).data;
    expect(d.healthLog!.e!.exam).toHaveLength(2);
  });
});

describe('Z5: quando refazer os exames', () => {
  const withExam = (weeks: number, date = '2026-10-01') =>
    updateSettings(addHealthEntry(base(), { id: 'e', date, kind: 'exame', exam: [{ name: 'Hematócrito', value: 45, unit: '%' }] }, NOW, TODAY).data, { examEveryWeeks: weeks }, NOW).data;

  it('sem intervalo ou sem exame, sem data; com os dois, a data e se passou', () => {
    expect(examSchedule(base(), TODAY)).toEqual({ last: undefined, due: undefined, overdue: false, daysLeft: null });
    expect(examSchedule(withExam(0), TODAY).due).toBeUndefined();
    expect(examSchedule(withExam(12), TODAY)).toEqual({ last: '2026-10-01', due: '2026-12-24', overdue: false, daysLeft: 35 });
    expect(examSchedule(withExam(6), TODAY)).toMatchObject({ due: '2026-11-12', overdue: true });
  });

  it('com os lembretes ligados, avisa às 9h do dia de refazer (discreto por padrão); vencido não agenda', () => {
    const on = (d: AppData) => updateSettings(d, { protocolEnabled: true, doseReminders: true }, NOW).data;
    const exam = doseRemindersFor(on(withExam(12)), NOW).find(r => r.id === EXAM_REMINDER_ID)!;
    expect(exam.at).toEqual(new Date(2026, 11, 24, 9));
    expect(exam.body).toBe(DISCREET_EXAM_BODY);
    expect(doseRemindersFor(on(withExam(6)), NOW).some(r => r.id === EXAM_REMINDER_ID)).toBe(false);
    const details = updateSettings(on(withExam(12)), { doseReminderDetails: true }, NOW).data;
    expect(doseRemindersFor(details, NOW).find(r => r.id === EXAM_REMINDER_ID)).toMatchObject({ title: 'Exames de sangue', body: 'Faz 12 semanas do último exame. Hora de refazer.' });
  });
});
