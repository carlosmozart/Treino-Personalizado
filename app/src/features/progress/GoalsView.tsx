import { useState } from 'react';
import { achievementList, startWeightGoal } from '../../domain/achievements';
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
  const ordered = [...list].sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt) || b.current / b.target - a.current / a.target);
  return (
    <div className="mt-4 space-y-4">
      <WeightGoalCard />
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">Conquistas</h2>
          <span className="text-sm text-muted" data-testid="conquistas">{unlocked}/{list.length}</span>
        </div>
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
