// M33 + W1: um treino feito vira plano. Num dia do plano atual (troca o que estiver lá) ou num
// plano novo, com o treino no dia da semana em que foi feito. Exercícios, séries, faixa de
// repetições (das séries feitas), carga da melhor série e o aquecimento vão juntos.
import { useState } from 'react';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { addPlan } from '../../domain/actions';
import { fromDateKey, toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { DAY_FULL_NAMES, dayKeyOf, type Workout } from '../../domain/model';
import { editPlan, planFromWorkout, workoutToPlanDay } from '../../domain/plan-edit';
import { rotationLetter } from '../../domain/rotation';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { dayTitle, formatNumber, plural, shortDate } from '../../ui/format';
import { workoutVolume } from '../../domain/workouts';

export function SaveToPlanSheet({ w, open, onClose, onDone, goToPlan = false }: {
  w: Workout | null; open: boolean; onClose: () => void; onDone?: (message: string) => void; goToPlan?: boolean;
}) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const setTab = useUiStore(s => s.setTab);
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;
  if (!w) return null;
  const finish = (message: string) => { onDone?.(message); onClose(); if (goToPlan) setTab('plano'); };

  const saveTo = (k: DayKey) => {
    if (!plan) return;
    const day = plan.days[k];
    const label = plan.rotation ? `Treino ${rotationLetter(plan, k) || 'novo'}` : DAY_FULL_NAMES[k];
    if (day.exercises.length && !confirm(`Trocar o que está em ${label} (${dayTitle(day, k).title}) por este treino?`)) return;
    run((d, now) => editPlan(d, plan.id, p => ({ ...p, days: { ...p.days, [k]: workoutToPlanDay(w) } }), now));
    finish(`Salvo no plano em ${label}.`);
  };
  const newPlan = () => {
    run((d, now) => addPlan(d, planFromWorkout(w, newId('plano'), toDateKey(now)), now));
    finish(`Plano novo criado, com este treino na ${DAY_FULL_NAMES[dayKeyOf(fromDateKey(w.date))].toLowerCase()}.`);
  };

  return (
    <Sheet title="Salvar no plano" open={open} onClose={onClose}>
      <p className="px-1 pb-2 text-sm text-muted">O treino vira plano: os mesmos exercícios e séries, a faixa de repetições que você fez, a carga da melhor série e o aquecimento.</p>
      <SheetAction onClick={newPlan}>
        <Icon name="mais" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-semibold">Criar um plano novo com este treino</span>
          <span className="block text-sm text-muted">{plan ? 'O plano atual continua salvo em Planos.' : 'Dá para ajustar tudo depois.'}</span>
        </span>
      </SheetAction>
      {plan && <p className="px-3 pb-1 pt-3 text-sm font-semibold text-muted">Ou num dia de “{plan.name}”</p>}
      {plan && DAY_KEYS.map(k => {
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
      })}
    </Sheet>
  );
}

/** W1: escolher um treino feito para virar plano (a partir do Plano). */
export function FromWorkoutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const workouts = useAppStore(s => s.data?.workouts);
  const [picked, setPicked] = useState<Workout | null>(null);
  const recent = [...(workouts ?? [])].filter(w => w.entries.length > 0).reverse().slice(0, 40);
  const close = () => { setPicked(null); onClose(); };
  return (
    <>
      <Sheet title="Usar um treino que já fiz" open={open && !picked} onClose={close}>
        <p className="px-1 pb-2 text-sm text-muted">Escolha um treino do histórico. Ele vira um plano novo ou um dia do plano atual.</p>
        {!recent.length && <p className="px-1 text-sm text-muted">Ainda não há treinos salvos.</p>}
        <ul>
          {recent.map(w => {
            const volume = workoutVolume(w);
            return (
              <li key={w.id}>
                <SheetAction onClick={() => setPicked(w)}>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-semibold">{w.dayName?.trim() || 'Treino'} · {shortDate(w.date)}</span>
                    <span className="block truncate text-sm text-muted">
                      {plural(w.entries.length, 'exercício', 'exercícios')}{volume ? ` · ${formatNumber(Math.round(volume))} kg` : ''} · {w.entries.slice(0, 3).map(e => e.name).join(', ')}
                    </span>
                  </span>
                </SheetAction>
              </li>
            );
          })}
        </ul>
      </Sheet>
      {picked && <SaveToPlanSheet w={picked} open onClose={close} goToPlan />}
    </>
  );
}
