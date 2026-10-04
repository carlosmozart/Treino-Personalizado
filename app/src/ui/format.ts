// Formatação para a interface, em português.
import type { DayKey } from '../domain/ai-plan';
import { fromDateKey, type DateKey } from '../domain/dates';
import { DAY_FULL_NAMES, type PlanDay } from '../domain/model';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** 42.5 → "42,5"; 40 → "40". */
export function formatNumber(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

/** "2026-10-02" → "2 out". */
export function shortDate(key: DateKey): string {
  const d = fromDateKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Segundos → "1:05" (ou "1:02:05"). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Título do dia sem repetir o sufixo (O2: "Domingo: Extra (Opcional) (Opcional)").
 * Dia sem nome vira o nome da semana.
 */
export function dayTitle(day: PlanDay, key: DayKey): { title: string; optional: boolean } {
  const title = day.name.trim() || DAY_FULL_NAMES[key];
  return { title: title.replace(/\s*\(opcional\)\s*$/i, ''), optional: day.optional || /\(opcional\)\s*$/i.test(title) };
}
