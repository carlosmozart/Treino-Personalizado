import { useState } from 'react';
import { bodyWeightAt, entryVolume, exerciseProgress, exercisesInHistory, sessionsOf, workSets } from '../../domain/workouts';
import { liftOf, repRecords, strengthLevel, LEVELS } from '../../domain/strength-levels';
import { toDateKey } from '../../domain/dates';
import { MergeExerciseButton } from './MergeExerciseSheet';
import { normalizeExerciseName } from '../../domain/text';
import { bestE1rm, weightForReps } from '../../domain/strength';
import { NumberField } from '../../ui/NumberField';
import { formatNumber } from '../../ui/format';
import { useAppStore } from '../../store';
import { useVolumeOptions } from '../../hooks/use-volume-options';
import { LineChart } from '../../ui/LineChart';
import { shortDate } from '../../ui/format';
import type { Workout } from '../../domain/model';

const NO_WORKOUTS: Workout[] = [];

/** Evolução por exercício: melhor carga (ou minutos) por sessão e a lista das sessões. */
type Metric = 'e1rm' | 'weight' | 'reps' | 'volume';
const METRICS: Record<Metric, { label: string; unit: string }> = {
  e1rm: { label: '1RM estimado', unit: 'kg' },
  weight: { label: 'Melhor carga', unit: 'kg' },
  reps: { label: 'Mais reps', unit: 'reps' },
  volume: { label: 'Volume', unit: 'kg' }
};

export function ExerciseProgressCard({ initialKey }: { initialKey?: string }) {
  const workouts = useAppStore(s => s.data?.workouts) ?? NO_WORKOUTS;
  const volumeOpts = useVolumeOptions();
  const profile = useAppStore(s => s.data?.profile);
  const list = exercisesInHistory(workouts);
  const [key, setKey] = useState(initialKey ?? '');
  const [metric, setMetric] = useState<Metric | null>(null);
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
  // M43: mais repetições numa série e volume da sessão, além de carga e 1RM
  const repsPts = cardio ? [] : sessionsOf(workouts, selected.key).flatMap(({ workout, entry }) => {
    const r = Math.max(0, ...workSets(entry).map(x => x.reps));
    return r > 0 ? [{ date: workout.date, value: r }] : [];
  });
  const volumePts = cardio ? [] : sessionsOf(workouts, selected.key).flatMap(({ workout, entry }) => {
    const v = Math.round(entryVolume(entry, volumeOpts, workout.date));
    return v > 0 ? [{ date: workout.date, value: v }] : [];
  });
  const weightPts = points.filter(p => p.value > 0);
  const series: Record<Metric, { date: string; value: number }[]> = { e1rm: e1rms, weight: weightPts, reps: repsPts, volume: volumePts };
  const available = (Object.keys(METRICS) as Metric[]).filter(m => series[m].length > 0);
  // padrão: 1RM; sem carga (peso do corpo), as repetições
  const shown: Metric = metric && available.includes(metric) ? metric : (available[0] ?? 'weight');
  const charted = cardio ? weightPts : series[shown];
  const best = e1rms.reduce<(typeof e1rms)[number] | null>((m, p) => (!m || p.value > m.value ? p : m), null);
  const unit = cardio ? 'min' : METRICS[shown].unit;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Evolução por exercício</h2>
      <label className="mt-2 block text-sm font-semibold text-muted">Exercício
        <select value={selected.key} onChange={e => setKey(e.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink">
          {list.map(e => <option key={e.key} value={e.key}>{e.name} ({e.sessions})</option>)}
        </select>
      </label>
      {/* V10: nomes duplicados do mesmo exercício */}
      <MergeExerciseButton name={selected.name} onMerged={to => setKey(normalizeExerciseName(to))} />
      {!cardio && available.length > 1 && (
        <div role="group" aria-label="Medida do gráfico" className="mt-3 flex flex-wrap gap-1">
          {available.map(id => (
            <button key={id} type="button" aria-pressed={shown === id} onClick={() => setMetric(id)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold ${shown === id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{METRICS[id].label}</button>
          ))}
        </div>
      )}
      <div className="mt-3">
        <LineChart unit={unit} points={charted.map(p => ({ label: shortDate(p.date), value: p.value, date: p.date }))}
          summary={`${selected.name}: ${cardio ? 'minutos' : METRICS[shown].label.toLowerCase()} em ${charted.length} sessões, de ${charted[0]?.value ?? 0} a ${charted.at(-1)?.value ?? 0} ${unit}`} />
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
      {best && <LevelLine name={selected.name} oneRm={best.value} profile={profile} />}
      {!cardio && <RepRecordsTable workouts={workouts} exerciseKey={selected.key} />}
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

/** V9: nível de força nos levantamentos principais, pelo 1RM estimado ÷ peso do corpo. */
function LevelLine({ name, oneRm, profile }: { name: string; oneRm: number; profile: { weighIns: { date: string; weight: number }[]; weightKg: number | null; sex: import('../../domain/health').Sex } | undefined }) {
  const lift = liftOf(name);
  if (!lift || !profile) return null;
  const body = bodyWeightAt({ weighIns: [...profile.weighIns].sort((a, b) => a.date.localeCompare(b.date)), weightKg: profile.weightKg }, toDateKey(new Date()));
  if (!body) return <p className="mt-3 text-sm text-muted">Registre o seu peso para ver o nível de força neste exercício.</p>;
  const v = strengthLevel(lift, oneRm, body, profile.sex);
  if (!v) return null;
  const step = LEVELS.indexOf(v.level);
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm" data-testid="nivel-de-forca">
      <p><strong>Nível de força: {v.level}</strong> <span className="text-muted">({formatNumber(v.ratio)}× o peso do corpo)</span></p>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
        {LEVELS.map((l, i) => <span key={l} className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-page'}`} />)}
      </div>
      {v.next && <p className="mt-1 text-muted">{v.next.level} a partir de {formatNumber(v.next.kg)} kg de 1RM estimado.</p>}
      <p className="mt-1 text-xs text-faint">Referência geral para adultos{profile.sex ? '' : ' (sem o sexo no Perfil, usa a referência masculina)'}; varia com a idade e o tempo de treino.</p>
    </div>
  );
}

/** W16: a maior carga para 1 a 12 repetições; sem marca, em cinza, o que o 1RM estimado diz. */
function RepRecordsTable({ workouts, exerciseKey }: { workouts: readonly Workout[]; exerciseKey: string }) {
  const rows = repRecords(workouts, exerciseKey);
  if (!rows.length) return null;
  return (
    <details className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Recordes por repetição</summary>
      <table className="mt-2 w-full tabular-nums">
        <thead><tr className="text-left text-xs text-muted"><th className="font-semibold">Reps</th><th className="font-semibold">Carga</th><th className="font-semibold">Quando</th></tr></thead>
        <tbody>
          {rows.filter(r => r.weight !== null || r.estimate !== null).map(r => (
            <tr key={r.reps} className="border-t border-line">
              <td className="py-1">{r.reps}</td>
              {r.weight !== null
                ? <><td className="py-1 font-semibold">{formatNumber(r.weight)} kg</td><td className="py-1 text-muted">{shortDate(r.date!)}</td></>
                : <><td className="py-1 text-faint">~{formatNumber(r.estimate ?? 0)} kg</td><td className="py-1 text-faint">estimado</td></>}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
