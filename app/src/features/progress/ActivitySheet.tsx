import { useState } from 'react';
import { ACTIVITY_KINDS, activityLabel, addActivity, deleteActivity, durationText, MAX_ACTIVITY_MINUTES, MAX_ACTIVITY_NOTE } from '../../domain/activities';
import { toDateKey } from '../../domain/dates';
import type { Activity, ActivityKind } from '../../domain/model';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { shortDate } from '../../ui/format';

const QUICK_MINUTES = [15, 30, 45, 60, 90];

/** W10: registrar corrida, futebol, sauna, alongamento... com a duração. */
export function ActivityButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-xl bg-surface-2 font-semibold">+ Registrar atividade ou recuperação</button>
      {open && <ActivitySheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function ActivitySheet({ onClose }: { onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const today = toDateKey(new Date());
  const [kind, setKind] = useState<ActivityKind>('corrida');
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState('');
  const other = kind === 'outra';
  const valid = minutes >= 1 && minutes <= MAX_ACTIVITY_MINUTES && !!date && date <= today && (!other || note.trim().length > 0);
  const save = () => {
    if (!valid) return;
    const id = crypto.randomUUID();
    run((d, now) => addActivity(d, { id, date, kind, minutes, note }, now, today));
    onClose();
  };
  const chips = (group: 'atividade' | 'recuperacao') => ACTIVITY_KINDS.filter(k => k.group === group).map(k => (
    <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
      className={`h-10 rounded-full px-3 text-sm font-semibold ${kind === k.id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{k.label}</button>
  ));
  return (
    <Sheet title="Registrar atividade" open onClose={onClose}>
      <p className="px-1 pb-2 text-sm text-muted">Para o que você faz fora da musculação. Aparece no histórico e na semana; não conta como treino nem dá XP.</p>
      <div role="radiogroup" aria-label="Atividade">
        <p className="text-xs font-semibold text-faint">Atividade</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{chips('atividade')}</div>
        <p className="mt-3 text-xs font-semibold text-faint">Recuperação</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{chips('recuperacao')}</div>
      </div>
      <label className="mt-3 block text-sm font-semibold text-muted">{other ? 'Qual atividade?' : 'Observação (opcional)'}
        <input value={note} maxLength={MAX_ACTIVITY_NOTE} onChange={e => setNote(e.target.value)} placeholder={other ? 'Ex.: vôlei de praia' : 'Ex.: 5 km no parque'}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold text-muted">Dia
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        </label>
        <div className="text-sm font-semibold text-muted">Duração (min)
          <div className="mt-1"><NumberField label="Duração em minutos" value={minutes} onChange={n => setMinutes(Math.min(MAX_ACTIVITY_MINUTES, Math.max(0, Math.round(n))))} /></div>
        </div>
      </div>
      <div role="group" aria-label="Duração rápida" className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_MINUTES.map(m => (
          <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}
            className={`h-10 rounded-full px-3 text-sm font-semibold ${minutes === m ? 'bg-surface-2 text-ink ring-2 ring-[var(--color-ink)]' : 'bg-surface-2 text-muted'}`}>{durationText(m)}</button>
        ))}
      </div>
      <button type="button" disabled={!valid} onClick={save} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">
        Salvar
      </button>
    </Sheet>
  );
}

/** Uma atividade no histórico: o que foi, quando, quanto tempo, e apagar. */
export function ActivityItem({ a }: { a: Activity }) {
  const run = useAppStore(s => s.run);
  const label = activityLabel(a);
  return (
    <li className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{label} · {durationText(a.minutes)}</p>
        <p className="truncate text-sm text-muted">{shortDate(a.date)}{a.note && a.kind !== 'outra' ? ` · ${a.note}` : ''}</p>
      </div>
      <button type="button" aria-label={`Apagar ${label} de ${shortDate(a.date)}`}
        onClick={() => { if (confirm(`Apagar ${label} de ${shortDate(a.date)}?`)) run((d, now) => deleteActivity(d, a.id, now)); }}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><Icon name="lixo" className="size-5" /></button>
    </li>
  );
}
