import { useState } from 'react';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { dayKeyOf, type Plan } from '../../domain/model';
import { TemplateSheet } from '../plan/TemplateSheet';
import { useAppStore } from '../../store';
import { askRestAlarmPermission } from './rest-alarm-instance';
import { dayTitle, plural } from '../../ui/format';
import { toDateKey } from '../../domain/dates';
import { rotationLetter, rotationState, rotationTitle } from '../../domain/rotation';

/** Escolha do treino: hoje em destaque e os demais dias logo abaixo. */
export function DayPicker() {
  const data = useAppStore(s => s.data);
  const start = useAppStore(s => s.startWorkout);
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;
  const [templatesOpen, setTemplatesOpen] = useState(false);

  if (!plan) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-lg font-bold">Você ainda não tem um plano</h2>
        <p className="mt-1 text-muted">Comece por um modelo pronto e ajuste depois na aba Plano.</p>
        <button type="button" onClick={() => setTemplatesOpen(true)}
          className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
          Escolher um modelo
        </button>
        <TemplateSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      </section>
    );
  }

  const now = new Date();
  const today = dayKeyOf(now);
  // treino concluído (ou presença marcada) hoje: o cartão de hoje não oferece começar de novo
  const doneToday = !!data?.checkins[toDateKey(now)];
  const startDay = (key: DayKey) => { askRestAlarmPermission(); start(plan.id, key); };
  // rotação (R1): o próximo primeiro, depois a volta na ordem
  const rot = data ? rotationState(plan, data.workouts) : null;
  if (rot) {
    const i = rot.order.indexOf(rot.next);
    const order = [...rot.order.slice(i), ...rot.order.slice(0, i)];
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted">{plan.name} · rotação, {rot.done} de {rot.order.length} da volta{doneToday ? ' · treino de hoje feito' : ''}</p>
        {order.map(key => (
          <DayCard key={key} plan={plan} dayKey={key} today={key === rot.next} done={false} onStart={() => startDay(key)}
            tag={`Treino ${rotationLetter(plan, key)}${key === rot.next ? ' · Próximo' : ''}`} />
        ))}
      </div>
    );
  }
  const order = [today, ...DAY_KEYS.filter(k => k !== today)];
  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-muted">{plan.name}</p>
      {order.map(key => <DayCard key={key} plan={plan} dayKey={key} today={key === today} done={key === today && doneToday} onStart={() => startDay(key)} />)}
    </div>
  );
}

function DayCard({ plan, dayKey, today, done, onStart, tag }: { plan: Plan; dayKey: DayKey; today: boolean; done: boolean; onStart: () => void; tag?: string }) {
  const day = plan.days[dayKey];
  const named = dayTitle(day, dayKey);
  const optional = named.optional;
  // rotação: sem o dia da semana no nome ("Segunda: A: Peito" vira "A: Peito"; sem nome, "Treino B")
  const title = tag ? rotationTitle(plan, dayKey) : named.title;
  const rest = day.exercises.length === 0;
  const tags = tag ?? [today ? 'Hoje' : '', optional ? 'Opcional' : ''].filter(Boolean).join(' · ');
  return (
    <article className={`rounded-2xl border bg-surface p-4 ${done ? 'border-success/60' : today ? 'border-primary' : 'border-line'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {tags && <p className="text-xs font-semibold text-muted">{tags}</p>}
          <h2 className="text-lg font-bold leading-snug">{title}</h2>
          <p className="text-sm text-muted">{rest ? 'Descanso' : `${plural(day.exercises.length, 'exercício', 'exercícios')}${day.focus ? ` · ${day.focus}` : ''}`}</p>
        </div>
        {done ? (
          <p className="shrink-0 font-semibold text-success">Feito hoje</p>
        ) : !rest && (
          <button type="button" onClick={onStart} aria-label={`Começar ${title}`}
            className={`h-11 shrink-0 rounded-xl px-4 font-bold ${today ? 'bg-primary text-white' : 'bg-surface-2 text-ink'}`}>
            Começar
          </button>
        )}
      </div>
    </article>
  );
}
