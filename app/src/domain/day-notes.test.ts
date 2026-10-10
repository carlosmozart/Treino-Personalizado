import { describe, expect, it } from 'vitest';
import { setDayNote } from './actions';
import { streakOf } from './rewards';
import { mergeAppData } from './sync';
import { sampleData, samplePlan } from './testing';

const T = new Date(2026, 9, 9, 20);

describe('nota de dia sem treino (S8)', () => {
  it('grava, apaga e não anota dia com treino', () => {
    let d = sampleData();
    d = setDayNote(d, '2026-10-08', { reason: 'doente', text: '  gripe  ' }, T).data;
    expect(d.dayNotes?.['2026-10-08']).toEqual({ reason: 'doente', text: 'gripe' });
    d = setDayNote(d, '2026-10-08', null, T).data;
    expect(d.dayNotes?.['2026-10-08']).toBeUndefined();
    const trained = { ...sampleData(), checkins: { '2026-10-07': { dayKey: null } } };
    expect(setDayNote(trained, '2026-10-07', { reason: 'outro' }, T).data).toBe(trained);
  });

  it('dia com nota não quebra a sequência', () => {
    const d = sampleData();
    d.plans.p1 = samplePlan(); // todo dia útil tem treino
    for (const c of ['2026-10-05', '2026-10-06', '2026-10-08']) d.checkins[c] = { dayKey: null };
    expect(streakOf(d, T)).toBe(1); // quarta (07) sem treino quebra
    expect(streakOf(setDayNote(d, '2026-10-07', { reason: 'viajando' }, T).data, T)).toBe(3);
  });

  it('sincroniza entre aparelhos, inclusive a exclusão', () => {
    const phone = setDayNote(sampleData(), '2026-10-08', { reason: 'lesao' }, T).data;
    const merged = mergeAppData(sampleData(), phone);
    expect(merged.dayNotes?.['2026-10-08']).toEqual({ reason: 'lesao' });
    const removed = setDayNote(phone, '2026-10-08', null, new Date(2026, 9, 9, 21)).data;
    expect(mergeAppData(merged, removed).dayNotes?.['2026-10-08']).toBeUndefined();
  });
});

describe('favoritos (M26)', () => {
  it('põe e tira pelo nome normalizado', async () => {
    const { toggleFavorite } = await import('./actions');
    let d = toggleFavorite(sampleData(), 'Rosca Direta (Barra)', T).data;
    expect(d.settings.favorites).toEqual(['rosca direta (barra)']);
    d = toggleFavorite(d, 'rosca direta (barra)', T).data;
    expect(d.settings.favorites).toEqual([]);
  });
});
