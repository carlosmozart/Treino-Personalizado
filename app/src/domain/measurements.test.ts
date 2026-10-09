import { describe, expect, it } from 'vitest';
import { saveMeasurements } from './actions';
import { measureSeries } from './measurements';
import { mergeAppData } from './sync';
import { sampleData } from './testing';

const T = new Date(2026, 9, 9, 20);

describe('medidas do corpo (S7)', () => {
  it('grava, ignora valores impossíveis e apaga o dia vazio', () => {
    let d = saveMeasurements(sampleData(), '2026-10-01', { cintura: 82.44, braco: -3, peito: 999 }, T).data;
    expect(d.measurements?.['2026-10-01']).toEqual({ cintura: 82.4 });
    d = saveMeasurements(d, '2026-10-01', {}, T).data;
    expect(d.measurements?.['2026-10-01']).toBeUndefined();
  });

  it('série por medida com a variação', () => {
    let d = saveMeasurements(sampleData(), '2026-09-01', { cintura: 84, braco: 32 }, T).data;
    d = saveMeasurements(d, '2026-10-01', { cintura: 81.5 }, T).data;
    const s = measureSeries(d);
    expect(s.map(x => x.id)).toEqual(['cintura', 'braco']);
    expect(s[0]).toMatchObject({ change: -2.5, points: [{ value: 84 }, { value: 81.5 }] });
    expect(s[1]!.change).toBeNull();
  });

  it('a gordura mais recente vai para o perfil', () => {
    let d = saveMeasurements(sampleData(), '2026-10-01', { gordura: 22 }, T).data;
    d = saveMeasurements(d, '2026-09-01', { gordura: 25 }, T).data;
    expect(d.profile.bodyFatPercent).toBe(22);
  });

  it('sincroniza entre aparelhos', () => {
    const phone = saveMeasurements(sampleData(), '2026-10-01', { coxa: 55 }, T).data;
    expect(mergeAppData(sampleData(), phone).measurements?.['2026-10-01']).toEqual({ coxa: 55 });
  });
});
