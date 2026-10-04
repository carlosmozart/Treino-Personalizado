import { useState } from 'react';
import { exerciseProgress, exercisesInHistory, sessionsOf } from '../../domain/workouts';
import { bestE1rm, weightForReps } from '../../domain/strength';
import { NumberField } from '../../ui/NumberField';
import { formatNumber } from '../../ui/format';
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
  const [metric, setMetric] = useState<'weight' | 'e1rm'>('e1rm');
  const [reps, setReps] = useState(10);
  const selected = list.find(e => e.key === key) ?? list[0];
  if (!selected) return null;
  const points = exerciseProgress(workouts, selected.key);
  const cardio = workouts.some(w => w.entries.some(e => e.key === selected.key && e.mode === 'cardio'));
  // M3: 1RM estimado por sessão (só séries até 12 reps), com a série que o gerou
  const e1rms = cardio ? [] : sessionsOf(workouts, selected.key).flatMap(({ workout, entry }) => {
    const b = bestE1rm(entry);
    return b ? [{ date: workout.date, value: b.value, set: b.set }] : [];
  });
  const useE1rm = !cardio && metric === 'e1rm' && e1rms.length > 0;
  const charted = useE1rm ? e1rms : points.filter(p => p.value > 0);
  const best = e1rms.reduce<(typeof e1rms)[number] | null>((m, p) => (!m || p.value > m.value ? p : m), null);
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
      {!cardio && e1rms.length > 0 && (
        <div role="group" aria-label="Medida do gráfico" className="mt-3 flex gap-1">
          {([['e1rm', '1RM estimado'], ['weight', 'Melhor carga']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={metric === id} onClick={() => setMetric(id)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold ${metric === id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{label}</button>
          ))}
        </div>
      )}
      <div className="mt-3">
        <LineChart unit={unit} points={charted.map(p => ({ label: shortDate(p.date), value: p.value, date: p.date }))}
          summary={`${selected.name}: ${cardio ? 'minutos' : useE1rm ? '1RM estimado' : 'melhor carga'} em ${charted.length} sessões, de ${charted[0]?.value ?? 0} a ${charted.at(-1)?.value ?? 0} ${unit}`} />
      </div>
      {best && (
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
          <p><strong>1RM estimado: {formatNumber(best.value)} kg</strong> <span className="text-muted">({formatNumber(best.set.weight)} kg × {best.set.reps} em {shortDate(best.date)})</span></p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-muted">Para</span>
            <NumberField label="Repetições para a calculadora" value={reps} onChange={n => setReps(Math.min(12, Math.max(1, Math.round(n))))} className="w-16" />
            <span className="text-muted">reps:</span>
            <strong>{formatNumber(weightForReps(best.value, reps))} kg</strong>
          </div>
          <p className="mt-1 text-xs text-faint">Estimativa pela fórmula de Epley, só com séries de até 12 repetições.</p>
        </div>
      )}
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
