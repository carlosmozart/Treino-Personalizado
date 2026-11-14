// T9: o histórico como planilha (CSV), uma linha por série. Ponto e vírgula como separador e
// vírgula decimal, com BOM UTF-8: o Excel e o Google Planilhas em português abrem direto, com
// acentos e números certos.
import { fromDateKey } from './dates';
import type { Workout } from './model';

export const CSV_HEADER = [
  'Data', 'Treino', 'Exercício', 'Série', 'Tipo', 'Repetições', 'Segundos', 'Carga (kg)',
  'Por lado', 'Até a falha', 'Minutos', 'Km', 'Deload', 'Nota', 'Nota da série', 'Nível', 'Hora'
] as const;

const num = (n: number | undefined) => (n === undefined ? '' : String(Math.round(n * 100) / 100).replace('.', ','));
const yes = (b: boolean | undefined) => (b ? 'sim' : '');

function cell(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function date(key: string): string {
  const d = fromDateKey(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** V14: a hora da série ("18:42"), no fuso do aparelho. */
const time = (iso: string | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
};

export function historyCsv(workouts: readonly Workout[]): string {
  const rows: string[][] = [[...CSV_HEADER]];
  const sorted = [...workouts].sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : (a.startedAt ?? '').localeCompare(b.startedAt ?? '')));
  for (const w of sorted) {
    const base = [date(w.date), w.dayName?.trim() || 'Treino'];
    for (const e of w.entries) {
      const note = e.note?.trim() ?? '';
      if (e.mode === 'cardio') {
        rows.push([...base, e.name, '', 'Cardio', '', '', '', '', '', num(e.cardio?.minutes), num(e.cardio?.km), yes(w.deload), note, '', num(e.cardio?.level), '']);
        continue;
      }
      e.sets.forEach((s, i) => {
        rows.push([
          ...base, e.name, String(i + 1), s.kind === 'warmup' ? 'Aquecimento' : 'Trabalho',
          e.mode === 'reps' ? String(s.reps) : '', e.mode === 'time' ? String(s.reps) : '', num(s.weight),
          yes(e.perSide), yes(s.failure), '', '', yes(w.deload), i === 0 ? note : '', s.note?.trim() ?? '', '', time(s.at)
        ]);
      });
    }
  }
  return `﻿${rows.map(r => r.map(cell).join(';')).join('\r\n')}\r\n`;
}
