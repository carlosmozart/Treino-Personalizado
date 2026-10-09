import { useState } from 'react';
import { MeasurementsCard } from './MeasurementsCard';
import { achievementList, startWeightGoal } from '../../domain/achievements';
import { removeWeighIn } from '../../domain/actions';
import { LineChart } from '../../ui/LineChart';
import { goalProgress } from '../../domain/body-goal';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { formatNumber, shortDate } from '../../ui/format';

/** Meta de peso com marcos e conquistas. */
export function GoalsView() {
  const data = useAppStore(s => s.data);
  if (!data) return null;
  const list = achievementList(data);
  const unlocked = list.filter(a => a.unlockedAt).length;
  const [filter, setFilter] = useState<'all' | 'done' | 'todo'>('all');
  const ordered = [...list].filter(a => filter === 'all' || (filter === 'done') === !!a.unlockedAt).sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt) || b.current / b.target - a.current / a.target);
  return (
    <div className="mt-4 space-y-4">
      <WeightGoalCard />
      <WeighInsCard />
      <MeasurementsCard />
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">Conquistas</h2>
          <span className="text-sm text-muted" data-testid="conquistas">{unlocked}/{list.length}</span>
        </div>
        <div role="group" aria-label="Filtrar conquistas" className="mt-3 flex gap-1">
          {([['all', 'Todas'], ['done', 'Desbloqueadas'], ['todo', 'Bloqueadas']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold ${filter === id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{label}</button>
          ))}
        </div>
        {ordered.length === 0 && <p className="mt-3 text-sm text-muted">{filter === 'done' ? 'Nenhuma conquista ainda — a primeira vem no primeiro check-in.' : 'Todas desbloqueadas!'}</p>}
        <ul className="mt-3 space-y-3">
          {ordered.map(a => (
            <li key={a.id} className={`flex gap-3 ${a.unlockedAt ? '' : 'opacity-70'}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${a.unlockedAt ? 'bg-warning/20 text-warning' : 'bg-surface-2 text-faint'}`}>
                <Icon name="trofeu" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-muted">{a.desc}</p>
                {a.unlockedAt ? <p className="text-xs font-semibold text-warning">Desbloqueada em {shortDate(a.unlockedAt)}</p> : a.target > 1 && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                    <span className="h-1.5 flex-1 rounded-full bg-surface-2"><span className="block h-1.5 rounded-full bg-primary" style={{ width: `${(a.current / a.target) * 100}%` }} /></span>
                    {Math.floor(a.current).toLocaleString('pt-BR')}/{a.target.toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function WeightGoalCard() {
  const profile = useAppStore(s => s.data?.profile);
  const run = useAppStore(s => s.run);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(0);
  if (!profile) return null;
  const current = profile.weighIns[profile.weighIns.length - 1]?.weight ?? profile.weightKg;
  const goal = profile.weightGoal;
  const progress = goal && current ? goalProgress(goal.startWeight, current, goal.targetWeight) : null;
  const openSheet = () => { setTarget(goal?.targetWeight ?? profile.targetWeightKg ?? current ?? 0); setOpen(true); };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Meta de peso</h2>
        {current && <button type="button" onClick={openSheet} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">{goal ? 'Nova meta' : 'Definir meta'}</button>}
      </div>
      {!current ? <p className="mt-2 text-sm text-muted">Registre seu peso na tela de Início para criar uma meta.</p>
        : !goal || !progress ? <p className="mt-2 text-sm text-muted">Sem meta definida.</p> : (
          <>
            <p className="mt-2 text-sm text-muted">{formatNumber(goal.startWeight)} kg → {formatNumber(goal.targetWeight)} kg · desde {shortDate(goal.startedAt)}</p>
            <p className="mt-1 text-3xl font-black">{Math.round(progress.percent)}%</p>
            <p className="text-sm text-muted">{progress.maintenance ? 'Meta de manutenção' : `faltam ${formatNumber(progress.remaining)} kg`}</p>
            <ol className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              {progress.checkpoints.map(c => {
                const date = goal.checkpoints?.[c.percent];
                return (
                  <li key={c.percent} className={`rounded-xl p-2 ${c.reached || date ? 'bg-success/20 text-success' : 'bg-surface-2 text-muted'}`}>
                    <span className="block font-bold">{c.percent}%</span>
                    <span className="block">{formatNumber(Math.round(c.weight * 10) / 10)} kg</span>
                    {date && <span className="block">{shortDate(date)}</span>}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      <Sheet title="Meta de peso" open={open} onClose={() => setOpen(false)}>
        <p className="text-sm text-muted">A meta começa do seu peso atual ({formatNumber(current ?? 0)} kg).</p>
        <label className="mt-3 block text-sm font-semibold text-muted">Peso desejado (kg)
          <NumberField label="Peso desejado em kg" decimal value={target} onChange={setTarget} className="mt-1" />
        </label>
        <button type="button" onClick={() => { run((d, now) => startWeightGoal(d, target, now)); setOpen(false); }}
          className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Começar meta</button>
      </Sheet>
    </section>
  );
}

/** Histórico de peso com opção de apagar uma pesagem errada. */
function WeighInsCard() {
  const profile = useAppStore(s => s.data?.profile);
  const run = useAppStore(s => s.run);
  const [all, setAll] = useState(false);
  if (!profile || !profile.weighIns.length) return null;
  const list = [...profile.weighIns].reverse();
  const shown = all ? list : list.slice(0, 5);
  const target = profile.weightGoal?.targetWeight ?? profile.targetWeightKg ?? undefined;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Pesagens</h2>
      <div className="mt-2">
        <LineChart unit="kg" {...(target ? { reference: target } : {})}
          points={profile.weighIns.map(w => ({ label: shortDate(w.date), value: w.weight, date: w.date }))}
          summary={`Peso em ${profile.weighIns.length} pesagens, de ${formatNumber(profile.weighIns[0]!.weight)} a ${formatNumber(list[0]!.weight)} kg`} />
      </div>
      <ul className="mt-2 divide-y divide-line text-sm">
        {shown.map(w => (
          <li key={w.date} className="flex items-center justify-between gap-3">
            <span className="text-muted">{shortDate(w.date)}</span>
            <span className="flex items-center gap-1 font-semibold">{formatNumber(w.weight)} kg
              <button type="button" aria-label={`Apagar pesagem de ${shortDate(w.date)}`} className="flex size-11 items-center justify-center text-muted"
                onClick={() => { if (confirm(`Apagar a pesagem de ${shortDate(w.date)} (${formatNumber(w.weight)} kg)?`)) run((d, now) => removeWeighIn(d, w.date, now)); }}>
                <Icon name="lixo" className="size-5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {list.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 h-11 font-semibold text-primary">{all ? 'Mostrar menos' : `Ver todas (${list.length})`}</button>
      )}
    </section>
  );
}
