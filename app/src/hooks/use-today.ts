// Virada de dia com o app aberto ou voltando do segundo plano: as telas calculam "hoje" ao
// desenhar, então quando a data muda o app redesenha (e roda a checagem diária, ex.: aniversário).
import { create } from 'zustand';
import { toDateKey, type DateKey } from '../domain/dates';

export const useToday = create<{ today: DateKey }>(() => ({ today: toDateKey(new Date()) }));

/** Confere a data agora; devolve se mudou. */
export function checkDayChange(now = new Date()): boolean {
  const today = toDateKey(now);
  if (today === useToday.getState().today) return false;
  useToday.setState({ today });
  return true;
}

export function startDayWatcher(onNewDay: () => void, doc: Pick<Document, 'addEventListener' | 'visibilityState'> = document) {
  const tick = () => { if (checkDayChange()) onNewDay(); };
  setInterval(tick, 60_000);
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') tick(); });
}
