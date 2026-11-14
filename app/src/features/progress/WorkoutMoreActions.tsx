import { useState } from 'react';
import { moveWorkoutDate } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import type { Workout } from '../../domain/model';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { SaveToPlanSheet } from './SaveToPlanSheet';

/** M33 e M15: salvar um treino feito como dia do plano, e mudar a data de um treino salvo. */
export function WorkoutMoreActions({ w }: { w: Workout }) {
  const run = useAppStore(s => s.run);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(w.date);
  const [done, setDone] = useState('');
  const today = toDateKey(new Date());

  return (
    <>
      <button type="button" onClick={() => { setDone(''); setSaving(true); }} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Salvar no plano</button>
      <button type="button" onClick={() => { setDate(w.date); setMoving(true); }} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Mudar a data</button>
      {done && <p role="status" className="w-full text-sm text-muted">{done}</p>}

      <SaveToPlanSheet w={w} open={saving} onClose={() => setSaving(false)} onDone={setDone} />

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
