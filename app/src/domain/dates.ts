/** Data no formato "AAAA-MM-DD", sempre no fuso local (nunca em UTC). */
export type DateKey = string;

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'] as const;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Converte a chave em Date ao meio-dia local, longe de virada de dia por horário de verão. */
export function fromDateKey(key: DateKey): Date {
  return new Date(`${key}T12:00:00`);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Segunda-feira da semana da data (domingo pertence à semana iniciada na segunda anterior). */
export function mondayOf(key: DateKey): DateKey {
  const date = fromDateKey(key);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateKey(date);
}

export function weekdayName(key: DateKey): string {
  return WEEKDAYS[fromDateKey(key).getDay()] ?? '';
}
