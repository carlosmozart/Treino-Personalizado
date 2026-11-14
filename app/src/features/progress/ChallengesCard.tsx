// V7: desafios do mês no Progresso: três metas com a barra, a medalha e o XP de cada uma.
import { CHALLENGE_XP, currentChallenges, daysLeftInMonth, monthName } from '../../domain/challenges';
import { toDateKey } from '../../domain/dates';
import { useToday } from '../../hooks/use-today';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { formatNumber, plural } from '../../ui/format';

export function ChallengesCard() {
  const data = useAppStore(s => s.data);
  useToday(s => s.today);
  if (!data) return null;
  const now = new Date();
  const list = currentChallenges(data, now);
  const done = list.filter(c => c.done).length;
  const left = daysLeftInMonth(now);
  return (
    <section aria-label="Desafios do mês" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">Desafios de {monthName(toDateKey(now).slice(0, 7))}</h2>
        <span className="text-sm text-muted">{done}/{list.length} · {left === 1 ? 'último dia' : `${left} dias`}</span>
      </div>
      <p className="text-sm text-muted">Metas feitas a partir dos seus últimos meses. Cada uma vale +{CHALLENGE_XP} XP.</p>
      <ul className="mt-3 space-y-3">
        {list.map(c => {
          const pct = Math.min(100, Math.round((c.current / c.target) * 100));
          return (
            <li key={c.id} aria-label={`${c.title}: ${c.goal}, ${c.done ? 'cumprido' : `${formatNumber(c.current)} de ${formatNumber(c.target)}`}`}>
              <div className="flex items-center gap-2">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${c.done ? 'bg-warning/20 text-warning' : 'bg-surface-2 text-faint'}`}>
                  <Icon name="trofeu" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.title} <span className="font-normal text-muted">· {c.goal}</span></p>
                  <div className="mt-1 h-2 rounded-full bg-surface-2" aria-hidden="true">
                    <div className={`h-2 rounded-full ${c.done ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">
                  {c.done ? 'Cumprido' : `${formatNumber(c.current)}/${formatNumber(c.target)}`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {done === list.length && <p className="mt-3 text-sm font-semibold text-warning">Mês perfeito: {plural(list.length, 'desafio cumprido', 'desafios cumpridos')}!</p>}
    </section>
  );
}
