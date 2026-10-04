import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { addPlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { dayKeyOf, type Plan } from '../../domain/model';
import { seedPlan } from '../../data/seed-plan';
import { newId } from '../../domain/ids';
import { useAppStore } from '../../store';
import { dayTitle, plural } from '../../ui/format';

/** Escolha do treino: hoje em destaque e os demais dias logo abaixo. */
export function DayPicker() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const start = useAppStore(s => s.startWorkout);
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;

  if (!plan) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-lg font-bold">Você ainda não tem um plano</h2>
        <p className="mt-1 text-muted">Comece pelo plano de exemplo (Push/Pull/Legs, 6 dias) e ajuste depois.</p>
        <button type="button" onClick={() => run((d, now) => addPlan(d, seedPlan(toDateKey(now), newId('plano')), now))}
          className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
          Usar plano de exemplo
        </button>
      </section>
    );
  }

  const today = dayKeyOf(new Date());
  const order = [today, ...DAY_KEYS.filter(k => k !== today)];
  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-muted">{plan.name}</p>
      {order.map(key => <DayCard key={key} plan={plan} dayKey={key} today={key === today} onStart={() => start(plan.id, key)} />)}
    </div>
  );
}

function DayCard({ plan, dayKey, today, onStart }: { plan: Plan; dayKey: DayKey; today: boolean; onStart: () => void }) {
  const day = plan.days[dayKey];
  const { title, optional } = dayTitle(day, dayKey);
  const rest = day.exercises.length === 0;
  const tags = [today ? 'Hoje' : '', optional ? 'Opcional' : ''].filter(Boolean).join(' · ');
  return (
    <article className={`rounded-2xl border bg-surface p-4 ${today ? 'border-primary' : 'border-line'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {tags && <p className="text-xs font-semibold text-muted">{tags}</p>}
          <h2 className="text-lg font-bold leading-snug">{title}</h2>
          <p className="text-sm text-muted">{rest ? 'Descanso' : `${plural(day.exercises.length, 'exercício', 'exercícios')}${day.focus ? ` · ${day.focus}` : ''}`}</p>
        </div>
        {!rest && (
          <button type="button" onClick={onStart} aria-label={`Começar ${title}`}
            className={`h-11 shrink-0 rounded-xl px-4 font-bold ${today ? 'bg-primary text-white' : 'bg-surface-2 text-ink'}`}>
            Começar
          </button>
        )}
      </div>
    </article>
  );
}
