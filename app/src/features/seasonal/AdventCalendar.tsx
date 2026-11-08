// Calendário do advento (V5): 24 portas no Início, de 1º a 24 de dezembro. A de hoje brilha, uma
// que passou espera, e as do futuro ficam fechadas. As abertas ficam guardadas neste aparelho.
import { useMemo, useState } from 'react';
import type { DateKey } from '../../domain/dates';
import { adventDay, adventDoors, canOpenDoor, yearNumbers } from '../../domain/seasonal';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { Gift } from './natal-art';

const keyOf = (year: string) => `tp-advento-${year}`;
const readOpened = (year: string): number[] => {
  try { return JSON.parse(localStorage.getItem(keyOf(year)) ?? '[]') as number[]; } catch { return []; }
};
const saveOpened = (year: string, doors: number[]) => {
  try { localStorage.setItem(keyOf(year), JSON.stringify(doors)); } catch { /* sem armazenamento: abre de novo */ }
};

export default function AdventCalendar({ today }: { today: DateKey }) {
  const data = useAppStore(s => s.data);
  const year = today.slice(0, 4);
  const day = adventDay(today)!;
  const [opened, setOpened] = useState(() => readOpened(year));
  const [showAll, setShowAll] = useState(false);
  const [door, setDoor] = useState<number | null>(null);
  const doors = useMemo(() => (data ? adventDoors(yearNumbers(data, Number(year))) : []), [data, year]);
  if (!data) return null;

  const open = (n: number) => {
    if (!canOpenDoor(n, today)) return;
    if (!opened.includes(n)) {
      const next = [...opened, n];
      setOpened(next);
      saveOpened(year, next);
    }
    setDoor(n);
  };
  const toChristmas = 25 - day;
  const content = door ? doors[door - 1] : null;

  return (
    <section aria-label="Calendário do advento" className="relative overflow-hidden rounded-2xl border border-primary/50 bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Calendário do advento</h2>
          <p className="text-sm text-muted">{toChristmas === 1 ? 'Amanhã é Natal!' : `Faltam ${toChristmas} dias para o Natal.`} Uma porta por dia, até o dia 24.</p>
        </div>
        <Gift size={36} />
      </div>
      <button type="button" onClick={() => open(day)} className="mt-3 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
        {opened.includes(day) ? `Ver a porta ${day} de novo` : `Abrir a porta de hoje (${day})`}
      </button>
      <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll} className="mt-1 h-11 w-full rounded-xl text-sm font-semibold text-muted">
        {showAll ? 'Esconder as portas' : 'Ver as 24 portas'}
      </button>
      {showAll && (
        <ol aria-label="Portas do calendário" className="mt-1 grid grid-cols-6 gap-1.5">
          {Array.from({ length: 24 }, (_, i) => i + 1).map(n => {
            const isOpen = opened.includes(n);
            const locked = !canOpenDoor(n, today);
            const missed = !locked && !isOpen && n < day;
            const label = `Porta ${n}${isOpen ? ', aberta' : locked ? `, abre no dia ${n}` : n === day ? ', hoje' : ', esperando você'}`;
            return (
              <li key={n}>
                <button type="button" disabled={locked} onClick={() => open(n)} aria-label={label}
                  className={`relative flex aspect-square w-full items-center justify-center rounded-lg text-sm font-black tabular-nums ${
                    isOpen ? 'bg-surface-2 text-muted' : locked ? 'bg-surface-2/60 text-faint' : 'bg-primary text-white'
                  } ${n === day ? 'ring-2 ring-[var(--color-warning)]' : ''}`}>
                  {isOpen ? '✓' : n}
                  {missed && <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" />}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <Sheet title={door ? `Porta ${door} · ${content?.kind ?? ''}` : 'Porta'} open={door !== null} onClose={() => setDoor(null)}>
        <div className="space-y-3 px-1 pb-3">
          <p className="text-base leading-relaxed">{content?.text}</p>
          <button type="button" onClick={() => setDoor(null)} className="h-12 w-full rounded-xl bg-surface-2 text-base font-bold">Fechar</button>
        </div>
      </Sheet>
    </section>
  );
}
