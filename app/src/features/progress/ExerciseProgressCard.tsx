import { useState } from 'react';
import { exerciseProgress, exercisesInHistory } from '../../domain/workouts';
import { useAppStore } from '../../store';
import { LineChart } from '../../ui/LineChart';
import { shortDate } from '../../ui/format';
import type { Workout } from '../../domain/model';

const NO_WORKOUTS: Workout[] = [];

/** Evolução por exercício: melhor carga (ou minutos) por sessão e a lista das sessões. */
export function ExerciseProgressCard({ initialKey }: { initialKey?: string }) {
  const workouts = useAppStore(s => s.data?.workouts) ?? NO_WORKOUTS;
  const list = exercisesInHistory(workouts);
  const [key, setKey] = useState(initialKey ?? '');
  const selected = list.find(e => e.key === key) ?? list[0];
  if (!selected) return null;
  const points = exerciseProgress(workouts, selected.key);
  const charted = points.filter(p => p.value > 0);
  const cardio = workouts.some(w => w.entries.some(e => e.key === selected.key && e.mode === 'cardio'));
  const unit = cardio ? 'min' : 'kg';
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Evolução por exercício</h2>
      <label className="mt-2 block text-sm font-semibold text-muted">Exercício
        <select value={selected.key} onChange={e => setKey(e.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink">
          {list.map(e => <option key={e.key} value={e.key}>{e.name} ({e.sessions})</option>)}
        </select>
      </label>
      <div className="mt-3">
        <LineChart unit={unit} points={charted.map(p => ({ label: shortDate(p.date), value: p.value }))}
          summary={`${selected.name}: ${cardio ? 'minutos' : 'melhor carga'} em ${charted.length} sessões, de ${charted[0]?.value ?? 0} a ${charted.at(-1)?.value ?? 0} ${unit}`} />
      </div>
      <ul className="mt-3 divide-y divide-line text-sm">
        {[...points].reverse().slice(0, 10).map(p => (
          <li key={`${p.workoutId}-${p.date}`} className="flex justify-between gap-3 py-2">
            <span className="text-muted">{shortDate(p.date)}</span>
            <span>{p.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
