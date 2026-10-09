// Medidas do corpo (S7): leitura para a tela, uma série por medida.
import type { AppData, MeasureKey } from './model';

export const MEASURES: { id: MeasureKey; label: string; unit: string }[] = [
  { id: 'cintura', label: 'Cintura', unit: 'cm' },
  { id: 'quadril', label: 'Quadril', unit: 'cm' },
  { id: 'peito', label: 'Peito', unit: 'cm' },
  { id: 'braco', label: 'Braço', unit: 'cm' },
  { id: 'coxa', label: 'Coxa', unit: 'cm' },
  { id: 'panturrilha', label: 'Panturrilha', unit: 'cm' },
  { id: 'gordura', label: 'Gordura', unit: '%' }
];

export interface MeasureSeries {
  id: MeasureKey;
  label: string;
  unit: string;
  points: { date: string; value: number }[];
  /** Última menos a primeira (null com um ponto só). */
  change: number | null;
}

/** Só as medidas que têm pelo menos um registro, em ordem de data. */
export function measureSeries(data: AppData): MeasureSeries[] {
  const dates = Object.keys(data.measurements ?? {}).sort();
  return MEASURES.flatMap(m => {
    const points = dates.flatMap(date => {
      const v = data.measurements![date]![m.id];
      return v === undefined ? [] : [{ date, value: v }];
    });
    if (!points.length) return [];
    const change = points.length > 1 ? Math.round((points.at(-1)!.value - points[0]!.value) * 10) / 10 : null;
    return [{ ...m, points, change }];
  });
}
