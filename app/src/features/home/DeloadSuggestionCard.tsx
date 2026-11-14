// W9: "Hora de uma semana leve?" no Início, quando o tempo, as cargas ou o check-in pedem. Marcar
// usa a semana de deload do M32; "Agora não" esconde até a semana seguinte.
import { useState } from 'react';
import { setDeloadWeek } from '../../domain/deload';
import { deloadSuggestion } from '../../domain/deload-suggest';
import { useToday } from '../../hooks/use-today';
import { useAppStore } from '../../store';

const keyOf = (week: string) => `tp-deload-dispensado-${week}`;
const dismissed = (week: string) => { try { return localStorage.getItem(keyOf(week)) === '1'; } catch { return false; } };

export function DeloadSuggestionCard() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  useToday(s => s.today);
  const [closed, setClosed] = useState(false);
  if (!data || closed) return null;
  const s = deloadSuggestion(data, new Date());
  if (!s || dismissed(s.week)) return null;
  const later = () => { try { localStorage.setItem(keyOf(s.week), '1'); } catch { /* sem armazenamento: aparece de novo */ } setClosed(true); };
  return (
    <section aria-label="Sugestão de deload" className="rounded-2xl border border-warning/60 bg-surface p-4">
      <h2 className="font-bold">Hora de uma semana leve?</h2>
      <p className="mt-1 text-sm text-muted">{s.text} Uma semana de deload, com cerca de 60% da carga e menos séries, ajuda o corpo a se recuperar e voltar mais forte. Os treinos dela não contam para a progressão.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => { run((d, now) => setDeloadWeek(d, true, now)); setClosed(true); }} className="h-11 rounded-xl bg-primary px-4 font-bold text-white">Marcar esta semana como deload</button>
        <button type="button" onClick={later} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Agora não</button>
      </div>
    </section>
  );
}
