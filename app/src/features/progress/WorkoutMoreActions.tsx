import { useState } from 'react';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { addPlan, moveWorkoutDate } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { DAY_FULL_NAMES, type Workout } from '../../domain/model';
import { blankPlan, editPlan, workoutToPlanDay } from '../../domain/plan-edit';
import { rotationLetter } from '../../domain/rotation';
import { useAppStore } from '../../store';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { dayTitle } from '../../ui/format';

/** M33 e M15: salvar um treino feito como dia do plano, e mudar a data de um treino salvo. */
export function WorkoutMoreActions({ w }: { w: Workout }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(w.date);
  const [done, setDone] = useState('');
  const today = toDateKey(new Date());
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;

  const saveTo = (k: DayKey) => {
    if (!plan) return;
    const day = plan.days[k];
    const label = plan.rotation ? `Treino ${rotationLetter(plan, k) || 'novo'}` : DAY_FULL_NAMES[k];
    if (day.exercises.length && !confirm(`Trocar o que está em ${label} (${dayTitle(day, k).title}) por este treino?`)) return;
    run((d, now) => editPlan(d, plan.id, p => ({ ...p, days: { ...p.days, [k]: workoutToPlanDay(w) } }), now));
    setDone(`Salvo no plano em ${label}.`);
    setSaving(false);
  };
  const newPlan = () => {
    run((d, now) => {
      const p = blankPlan(newId('plano'), toDateKey(now), w.dayName?.trim() || 'Plano do treino');
      return addPlan(d, { ...p, days: { ...p.days, SEG: workoutToPlanDay(w) } }, now);
    });
    setDone('Plano criado com este treino na segunda-feira.');
    setSaving(false);
  };

  return (
    <>
      <button type="button" onClick={() => { setDone(''); setSaving(true); }} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Salvar no plano</button>
      <button type="button" onClick={() => { setDate(w.date); setMoving(true); }} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Mudar a data</button>
      {done && <p role="status" className="w-full text-sm text-muted">{done}</p>}

      <Sheet title="Salvar no plano" open={saving} onClose={() => setSaving(false)}>
        <p className="px-1 pb-2 text-sm text-muted">O treino vira um dia do plano: os mesmos exercícios, séries, repetições e a carga da melhor série.</p>
        {plan ? DAY_KEYS.map(k => {
          const day = plan.days[k];
          const label = plan.rotation ? (day.exercises.length ? `Treino ${rotationLetter(plan, k)}` : 'Treino novo') : DAY_FULL_NAMES[k];
          return (
            <SheetAction key={k} onClick={() => saveTo(k)}>
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted">{day.exercises.length ? `Troca: ${dayTitle(day, k).title}` : 'Vazio'}</span>
              </span>
            </SheetAction>
          );
        }) : <SheetAction onClick={newPlan}>Criar um plano com este treino</SheetAction>}
      </Sheet>

      <Sheet title="Mudar a data do treino" open={moving} onClose={() => setMoving(false)}>
        <div className="space-y-3 px-1 pb-3">
          <p className="text-sm text-muted">O treino, o horário e a presença do dia vão para a data nova.</p>
          <label className="block text-sm font-semibold text-muted">Data
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
          </label>
          <button type="button" disabled={!date || date > today || date === w.date}
            onClick={() => { run((d, now) => moveWorkoutDate(d, w.id, date, now)); setMoving(false); }}
            className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">Mudar a data</button>
        </div>
      </Sheet>
    </>
  );
}
