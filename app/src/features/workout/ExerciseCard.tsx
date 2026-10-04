import { useMemo, useState } from 'react';
import { groupOf } from '../../data/exercise-library';
import {
  addSet, completeExercise, isExerciseDone, removeSet, setNote, swapExercise, toggleSet, updateCardio, updateSet,
  type ActiveSession, type SessionExercise
} from '../../domain/session';
import { bestSet, lastSessionBefore, sessionsOf, workSets } from '../../domain/workouts';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { formatNumber, shortDate } from '../../ui/format';
import { useRestStore } from './rest-store';

interface Props {
  session: ActiveSession;
  index: number;
}

/** Contexto do exercício (N4): última vez e melhor série, pelo histórico do nome. */
function useExerciseContext(ex: SessionExercise, date: string) {
  const workouts = useAppStore(s => s.data?.workouts);
  return useMemo(() => {
    if (!workouts || ex.mode === 'cardio') return { last: null, best: null };
    const last = lastSessionBefore(workouts, ex.key, date);
    let best: { reps: number; weight: number } | null = null;
    for (const { entry } of sessionsOf(workouts, ex.key)) {
      const b = bestSet(entry);
      if (b && (!best || b.weight > best.weight || (b.weight === best.weight && b.reps > best.reps))) best = b;
    }
    const lastText = last
      ? `${shortDate(last.workout.date)}: ${workSets(last.entry).map(s => `${formatNumber(s.weight)}×${s.reps}`).join(', ')}${last.entry.aggregated ? ' (registro antigo)' : ''}`
      : null;
    return { last: lastText, best };
  }, [workouts, ex.key, ex.mode, date]);
}

export function ExerciseCard({ session, index }: Props) {
  const ex = session.exercises[index]!;
  const update = useAppStore(s => s.updateSession);
  const data = useAppStore(s => s.data);
  const [menu, setMenu] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(ex.note !== '');
  const [tipOpen, setTipOpen] = useState(false);
  const { last, best } = useExerciseContext(ex, session.date);
  const group = groupOf(ex.name);
  const done = isExerciseDone(ex);
  const unit = ex.mode === 'time' ? 'Seg' : 'Reps';

  function toggle(setIndex: number) {
    const wasDone = ex.sets[setIndex]?.done;
    update(s => toggleSet(s, index, setIndex));
    const settings = data?.settings;
    if (!wasDone && settings?.restAutoStart) useRestStore.getState().start(ex.restSeconds ?? settings.restSeconds);
  }

  const close = () => setMenu(false);

  return (
    <article aria-label={ex.name} className={`rounded-2xl border bg-surface p-4 ${done ? 'border-success/60' : 'border-line'}`}>
      {/* O14/N2: o nome ganha a linha; ações secundárias ficam no menu ⋯ */}
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug">
            <span className="mr-2 text-faint">{index + 1}</span>{ex.name}
          </h3>
          {ex.swappedFrom && <p className="text-sm text-muted">no lugar de {ex.swappedFrom}</p>}
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold">
            {group && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{group}</span>}
            {ex.optional && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Opcional</span>}
            {best && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Melhor: {formatNumber(best.weight)} kg × {best.reps}</span>}
          </div>
          {last && <p className="mt-1.5 text-sm text-muted">Última vez ({last})</p>}
        </div>
        <button type="button" onClick={() => setMenu(true)} aria-label={`Opções de ${ex.name}`}
          className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2">
          <Icon name="opcoes" className="size-7" />
        </button>
      </header>

      {ex.mode === 'cardio' && ex.cardio ? (
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label className="text-xs font-semibold text-muted">Minutos
            <NumberField label="Minutos" value={ex.cardio.minutes} onChange={v => update(s => updateCardio(s, index, { minutes: v }))} className="mt-1" />
          </label>
          <label className="text-xs font-semibold text-muted">Km
            <NumberField label="Quilômetros" decimal value={ex.cardio.km} onChange={v => update(s => updateCardio(s, index, { km: v }))} className="mt-1" />
          </label>
          <DoneButton done={ex.cardio.done} label={`Cardio de ${ex.name} feito`} onClick={() => update(s => updateCardio(s, index, { done: !ex.cardio!.done }))} />
        </div>
      ) : (
        <div className="mt-3">
          {/* N1: cabeçalho de colunas, carga antes das repetições */}
          <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-0.5 text-xs font-semibold text-faint">
            <span>Série</span><span className="text-center">Carga (kg)</span><span className="text-center">{unit}</span><span className="sr-only">Feita</span>
          </div>
          <ol className="mt-1 space-y-2">
            {ex.sets.map((set, i) => (
              <li key={i} className={`grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-xl ${set.done ? 'bg-success/10' : ''}`}>
                <span className={`text-center text-base font-bold ${set.kind === 'warmup' ? 'text-warning' : 'text-muted'}`} title={set.kind === 'warmup' ? 'Aquecimento' : undefined}>
                  {set.kind === 'warmup' ? 'A' : i + 1 - ex.sets.slice(0, i).filter(s => s.kind === 'warmup').length}
                </span>
                <NumberField label={`Carga da série ${i + 1}`} decimal value={set.weight} onChange={v => update(s => updateSet(s, index, i, { weight: v }))} />
                <NumberField label={`${unit} da série ${i + 1}`} value={set.reps} onChange={v => update(s => updateSet(s, index, i, { reps: v }))} />
                <DoneButton done={set.done} label={`Série ${i + 1} feita`} onClick={() => toggle(i)} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {noteOpen && (
        <textarea aria-label={`Observação de ${ex.name}`} value={ex.note} maxLength={500} rows={2}
          onChange={e => { const v = e.currentTarget.value; update(s => setNote(s, index, v)); }}
          placeholder="Ex.: falha na última, boa execução…"
          className="mt-3 w-full rounded-xl border border-line bg-page p-3 text-base text-ink placeholder:text-faint focus:border-primary focus:outline-none" />
      )}
      {tipOpen && ex.tip && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-info">{ex.tip}</p>}

      <Sheet title={ex.name} open={menu} onClose={close}>
        {ex.mode !== 'cardio' && <>
          <SheetAction onClick={() => { update(s => completeExercise(s, index, !done)); close(); }}>
            <Icon name="check" />{done ? 'Desmarcar todas as séries' : 'Marcar todas as séries'}
          </SheetAction>
          <SheetAction onClick={() => { update(s => addSet(s, index)); close(); }}><Icon name="mais" />Adicionar série</SheetAction>
          {ex.sets.length > 1 && (
            <SheetAction onClick={() => { update(s => removeSet(s, index, ex.sets.length - 1)); close(); }}><Icon name="menos" />Remover última série</SheetAction>
          )}
        </>}
        {/* O15: trocar só aparece quando há reserva (ou para voltar ao original) */}
        {(ex.alternatives.length > 0 || ex.swappedFrom) && (
          <SheetAction onClick={() => { close(); setSwapOpen(true); }}><Icon name="trocar" />Trocar exercício</SheetAction>
        )}
        <SheetAction onClick={() => { setNoteOpen(o => !o); close(); }}><Icon name="nota" />{noteOpen ? 'Esconder observação' : 'Observação'}</SheetAction>
        {ex.tip && <SheetAction onClick={() => { setTipOpen(o => !o); close(); }}><Icon name="dica" />{tipOpen ? 'Esconder dica' : 'Ver dica'}</SheetAction>}
      </Sheet>

      <Sheet title="Trocar por" open={swapOpen} onClose={() => setSwapOpen(false)}>
        {[...(ex.swappedFrom ? [{ name: ex.swappedFrom, mode: 'reps' as const }] : []), ...ex.alternatives]
          .filter(a => a.name !== ex.name)
          .map(a => (
            <SheetAction key={a.name} onClick={() => { if (data) update(s => swapExercise(s, data, index, a.name)); setSwapOpen(false); }}>
              <Icon name="trocar" />{a.name}{a.name === ex.swappedFrom ? ' (original)' : ''}
            </SheetAction>
          ))}
        <p className="mt-2 px-3 text-sm text-faint">A troca vale só para este treino; o plano continua igual.</p>
      </Sheet>
    </article>
  );
}

function DoneButton({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={done}
      className={`flex size-11 items-center justify-center rounded-xl border-2 transition-colors ${
        done ? 'border-success bg-success text-white' : 'border-line bg-page text-faint'}`}>
      <Icon name="check" />
    </button>
  );
}
