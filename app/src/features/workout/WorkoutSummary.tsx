import { useState } from 'react';
import { DAY_FULL_NAMES, type Workout } from '../../domain/model';
import { addedEntries, addEntriesToPlan, editPlan } from '../../domain/plan-edit';
import { rotationLetter } from '../../domain/rotation';
import { compareWithLast, describeEntry, workoutCalories, workoutVolume, type Trend } from '../../domain/workouts';
import { nextWorkoutAfterToday } from '../../domain/home';
import { RECORD_LABEL, recordKinds } from '../../domain/strength';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { formatNumber } from '../../ui/format';
import { useWorkoutUi } from './workout-ui';
import { CopyTextButton } from '../progress/CopyTextButton';
import { ShareImageButton } from '../progress/ShareImageButton';

/** Resumo logo após finalizar: o que entrou no histórico, com números grandes. */
export function WorkoutSummary({ id }: { id: string }) {
  const data = useAppStore(s => s.data);
  const close = () => useWorkoutUi.getState().showSummary(null);
  const workout = data?.workouts.find(w => w.id === id);
  if (!data || !workout) return null;
  const calories = workoutCalories(workout, data.profile.weightKg ?? 0, data.settings.restSeconds);
  const volume = workoutVolume(workout);
  // O4: duração estimada aparece como estimada, nunca "1 min" ao lado de calorias de 30 min
  const estimated = !!calories && !calories.measured;
  const minutes = estimated ? `~${calories.strengthMinutes} min` : workout.durationMin ? `${workout.durationMin} min` : '—';

  return (
    <section aria-label="Resumo do treino" className="pt-6">
      <h1 className="text-3xl font-black">Treino salvo</h1>
      <p className="mt-1 text-muted">{workout.dayName}</p>
      <dl className="mt-5 grid grid-cols-3 gap-2">
        <Stat label={estimated ? 'Duração (estimada)' : 'Duração'} value={minutes} />
        <Stat label="Volume" value={volume ? `${formatNumber(volume)} kg` : '—'} />
        <Stat label="Calorias" value={calories ? `${calories.kcal}` : '—'} />
      </dl>
      <ul className="mt-5 space-y-2">
        {workout.entries.map(entry => (
          <li key={entry.key} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{entry.name}</p>
              <p className="text-sm text-muted">{describeEntry(entry)}</p>
              <LastTime cmp={compareWithLast(data.workouts, workout, entry)} />
            </div>
            {(() => {
              const records = recordKinds(data.workouts, workout, entry);
              return records.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-bold text-warning">
                  <Icon name="trofeu" className="size-4" />Recorde: {records.map(r => RECORD_LABEL[r]).join(', ')}
                </span>
              );
            })()}
          </li>
        ))}
      </ul>
      <AddedToPlan workout={workout} />
      {(() => {
        const next = nextWorkoutAfterToday(data, new Date());
        return next && (
          <p className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="block text-xs font-semibold text-muted">Próximo treino · {next.when}</span>
            <span className="font-semibold">{next.title}</span>
          </p>
        );
      })()}
      <div className="mt-6 flex flex-wrap justify-center gap-2"><ShareImageButton w={workout} primary /><CopyTextButton w={workout} /></div>
      <button type="button" onClick={close} className="mt-3 h-12 w-full rounded-xl bg-surface-2 text-base font-bold">Fechar</button>
    </section>
  );
}

/**
 * T13 "Novo neste treino": exercícios acrescentados durante a sessão, com um toque para pôr no dia
 * do plano como foram feitos. Sem toque, o plano fica como estava.
 */
function AddedToPlan({ workout }: { workout: Workout }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [saved, setSaved] = useState<string[]>([]);
  const plan = workout.planId ? data?.plans[workout.planId] : undefined;
  // o que já entrou some de addedEntries; guarda os nomes para dizer "No plano"
  const pending = addedEntries(plan, workout);
  const shown = workout.entries.filter(e => e.added && (saved.includes(e.key) || pending.some(p => p.key === e.key)));
  if (!plan || !workout.dayKey || !shown.length) return null;
  const k = workout.dayKey;
  const dayLabel = plan.rotation ? `treino ${rotationLetter(plan, k)}` : DAY_FULL_NAMES[k].toLowerCase();
  const add = (keys: string[]) => {
    run((d, now) => editPlan(d, plan.id, p => addEntriesToPlan(p, workout, keys), now));
    setSaved(s => [...s, ...keys]);
  };
  return (
    <section aria-label="Novo neste treino" className="mt-5 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Novo neste treino</h2>
      <p className="text-sm text-muted">Acrescentados hoje. Leve ao plano ({dayLabel}) com as séries, as repetições e a carga de hoje.</p>
      <ul className="mt-2 divide-y divide-line">
        {shown.map(e => (
          <li key={e.key} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{e.name}</span>
              <span className="block text-sm text-muted">{describeEntry(e)}</span>
            </span>
            {saved.includes(e.key)
              ? <span className="text-sm font-semibold text-success">No plano</span>
              : <button type="button" onClick={() => add([e.key])} aria-label={`Adicionar ${e.name} ao plano`}
                  className="h-11 shrink-0 rounded-xl bg-surface-2 px-3 text-sm font-semibold">Adicionar</button>}
          </li>
        ))}
      </ul>
      {pending.length > 1 && (
        <button type="button" onClick={() => add(pending.map(e => e.key))} className="mt-2 h-11 w-full rounded-xl bg-primary text-sm font-bold text-white">
          Adicionar todos ao plano
        </button>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-black tabular-nums">{value}</dd>
    </div>
  );
}

const TREND: Record<Exclude<Trend, 'first'>, { text: string; tone: string }> = {
  up: { text: 'Subiu', tone: 'text-success' },
  same: { text: 'Igual à última vez', tone: 'text-muted' },
  down: { text: 'Caiu', tone: 'text-warning' }
};

/** S4: a melhor série contra a da última vez. */
function LastTime({ cmp }: { cmp: ReturnType<typeof compareWithLast> }) {
  if (!cmp) return null;
  if (cmp.trend === 'first') return <p className="text-xs font-semibold text-info">Primeira vez</p>;
  const t = TREND[cmp.trend];
  const before = cmp.before ? `${formatNumber(cmp.before.weight)} kg × ${cmp.before.reps}` : '';
  return <p className={`text-xs font-semibold ${t.tone}`}>{t.text}{cmp.trend !== 'same' && before ? ` (antes: ${before})` : ''}</p>;
}
