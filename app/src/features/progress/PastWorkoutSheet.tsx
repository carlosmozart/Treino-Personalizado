import { useState } from 'react';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { addDays, toDateKey } from '../../domain/dates';
import { startPastSession } from '../../domain/session';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { dayTitle } from '../../ui/format';

/** M15: registrar um treino de um dia passado (esqueceu de anotar no dia). */
export function PastWorkoutButton() {
  const [open, setOpen] = useState(false);
  const running = useAppStore(s => !!s.session);
  return (
    <>
      <button type="button" disabled={running} onClick={() => setOpen(true)}
        className="h-11 w-full rounded-xl bg-surface-2 font-semibold disabled:opacity-50">
        {running ? 'Termine o treino em andamento para registrar outro' : '+ Registrar treino passado'}
      </button>
      {open && <PastWorkoutSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function PastWorkoutSheet({ onClose }: { onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const setTab = useUiStore(s => s.setTab);
  const today = toDateKey(new Date());
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;
  const days = plan ? DAY_KEYS.filter(k => plan.days[k].exercises.length > 0) : [];
  const [date, setDate] = useState(addDays(today, -1));
  const [dayKey, setDayKey] = useState<DayKey | undefined>(days[0]);
  const [time, setTime] = useState('18:00');
  const [minutes, setMinutes] = useState(60);

  const start = () => {
    if (!data || !plan || !dayKey || date > today) return;
    const session = startPastSession(data, plan.id, dayKey, date, time, minutes, crypto.randomUUID());
    if (!session) return;
    useAppStore.getState().openSession(session);
    onClose();
    setTab('treino');
  };

  return (
    <Sheet title="Registrar treino passado" open onClose={onClose}>
      <div className="space-y-3 px-1 pb-3">
        {!plan || !days.length ? (
          <p className="text-sm text-muted">Crie um plano primeiro: o treino passado começa por um dos treinos do plano.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Escolha o dia e o treino; depois marque as séries que fez, como num treino normal. Ele entra no histórico com essa data, sem virar recorde retroativo.</p>
            <label className="block text-sm font-semibold text-muted">Data
              <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
            </label>
            <label className="block text-sm font-semibold text-muted">Treino
              <select value={dayKey} onChange={e => setDayKey(e.target.value as DayKey)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink">
                {days.map(k => <option key={k} value={k}>{dayTitle(plan.days[k], k).title}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-muted">Início
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
              </label>
              <label className="block text-sm font-semibold text-muted">Duração (min)
                <NumberField label="Duração em minutos" value={minutes} onChange={n => setMinutes(Math.min(300, Math.max(1, n)))} className="mt-1" />
              </label>
            </div>
            <button type="button" onClick={start} disabled={date > today}
              className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">
              Abrir o treino para marcar as séries
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
