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

/**
 * Distância de uma data até hoje (R6): "hoje", "ontem", "há 3 dias", "há 2 semanas",
 * "há 4 meses", "há 1 ano". Datas futuras viram "hoje".
 */
export function relativeDate(key: DateKey, today: DateKey): string {
  const days = Math.round((fromDateKey(today).getTime() - fromDateKey(key).getTime()) / 86_400_000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 14) return `há ${days} dias`;
  if (days < 60) return `há ${Math.floor(days / 7)} semanas`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return `há ${plural(years, 'ano', 'anos')}`;
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
