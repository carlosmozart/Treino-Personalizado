import { useMemo, useState } from 'react';
import { EXERCISE_LIBRARY, groupOf, guessGroup, swapSuggestions } from '../../data/exercise-library';
import {
  addSet, addWarmupSet, adjustWeights, removeWarmupSet, completeExercise, isExerciseDone, duplicateSet, insertSet, removeSet, setNote, swapExercise, toggleFailure, toggleSet, updateCardio, updateSet,
  type ActiveSession, type SessionExercise, type SessionSet
} from '../../domain/session';
import { bestSet, lastSessionBefore, sessionsOf, suspiciousWeight, workSets } from '../../domain/workouts';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { ExerciseIllustration, ExerciseThumb, hasIllustration } from '../../ui/ExerciseIllustration';
import { markBigWeightJump, updateSettings } from '../../domain/actions';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { formatNumber, relativeDate, shortDate } from '../../ui/format';
import { useRestStore } from './rest-store';
import { PlateSheet } from './PlateSheet';
import { SwipeRow } from '../../ui/SwipeRow';
import { searchNames } from '../../domain/search';
import { isBarbell } from '../../domain/plates';

const ALL_NAMES = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];
const ADJUSTS = [-5, -0.5, 0.5, 5, 10] as const;

interface Props {
  session: ActiveSession;
  index: number;
  /** Modo foco: o cartão não recolhe ao concluir (é o único na tela). */
  alwaysOpen?: boolean;
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
      ? {
          when: relativeDate(last.workout.date, date),
          date: shortDate(last.workout.date),
          sets: `${workSets(last.entry).map(s => `${formatNumber(s.weight)}×${s.reps}`).join(', ')}${last.entry.aggregated ? ' (registro antigo)' : ''}`
        }
      : null;
    return { last: lastText, best };
  }, [workouts, ex.key, ex.mode, date]);
}

export function ExerciseCard({ session, index, alwaysOpen = false }: Props) {
  const ex = session.exercises[index]!;
  const update = useAppStore(s => s.updateSession);
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const showIllustrations = data?.settings.showIllustrations ?? true;
  const [menu, setMenu] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(ex.note !== '');
  const [tipOpen, setTipOpen] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  // R2: série apagada fica alguns segundos para desfazer
  const [removed, setRemoved] = useState<{ at: number; set: SessionSet; timer: number } | null>(null);
  const swipe = data?.settings.swipeSets ?? true;
  const removeWithUndo = (i: number) => {
    const set = ex.sets[i];
    if (!set || ex.sets.length <= 1) return;
    if (removed) clearTimeout(removed.timer);
    update(s => removeSet(s, index, i));
    setRemoved({ at: i, set, timer: window.setTimeout(() => setRemoved(null), 5000) });
  };
  const undoRemove = () => {
    if (!removed) return;
    clearTimeout(removed.timer);
    update(s => insertSet(s, index, removed.at, removed.set));
    setRemoved(null);
  };
  // R6: "há 3 dias"; tocar mostra a data
  const [showDate, setShowDate] = useState(false);
  const { last, best } = useExerciseContext(ex, session.date);
  const group = groupOf(ex.name);
  const done = isExerciseDone(ex);
  const unit = ex.mode === 'time' ? 'Seg' : 'Reps';

  const [check, setCheck] = useState<{ set: number; weight: number; max: number; suggestion: number | null } | null>(null);
  const [query, setQuery] = useState('');

  function toggle(setIndex: number, confirmed = false) {
    const wasDone = ex.sets[setIndex]?.done;
    const weight = ex.sets[setIndex]?.weight ?? 0;
    // carga com um dígito a mais vira recorde falso e achata o gráfico: confere antes
    const suspicious = !wasDone && !confirmed && data ? suspiciousWeight(data.workouts, ex.key, weight) : null;
    if (suspicious) { setCheck({ set: setIndex, weight, ...suspicious }); return; }
    update(s => toggleSet(s, index, setIndex));
    const settings = data?.settings;
    if (!wasDone && settings?.restAutoStart) useRestStore.getState().start(ex.restSeconds ?? settings.restSeconds);
  }

  const close = () => setMenu(false);

  // exercício concluído recolhe para uma linha (o próximo sobe na tela); toque reabre
  const [expanded, setExpanded] = useState(false);
  if (done && !expanded && !alwaysOpen) {
    const summary = ex.mode === 'cardio' && ex.cardio
      ? `${ex.cardio.minutes} min${ex.cardio.km ? ` · ${formatNumber(ex.cardio.km)} km` : ''}`
      : ex.sets.filter(x => x.done).map(x => `${formatNumber(x.weight)}×${x.reps}`).join(', ');
    return (
      <article aria-label={ex.name} className="rounded-2xl border border-success/60 bg-surface">
        <button type="button" onClick={() => setExpanded(true)} aria-expanded={false} aria-label={`${ex.name}, concluído. Abrir`}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white"><Icon name="check" className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{ex.name}</span>
            <span className="block truncate text-sm text-muted">{summary}</span>
          </span>
          <Icon name="descer" className="size-5 shrink-0 text-faint" />
        </button>
      </article>
    );
  }

  return (
    <article aria-label={ex.name} className={`rounded-2xl border bg-surface p-4 ${done ? 'border-success/60' : 'border-line'}`}>
      {/* O14/N2: o nome ganha a linha; ações secundárias ficam no menu ⋯ */}
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug">
            <span className="mr-2 text-faint">{index + 1}</span>{ex.name}
          </h3>
          {ex.swappedFrom && <p className="text-sm text-muted">no lugar de {ex.swappedFrom}</p>}
        </div>
        <button type="button" onClick={() => setMenu(true)} aria-label={`Opções de ${ex.name}`}
          className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2">
          <Icon name="opcoes" className="size-7" />
        </button>
      </header>
      <div className="mt-2 flex gap-3">
        {showIllustrations && <ExerciseIllustration name={ex.name} size={data?.settings.illustrationSize ?? 'medium'} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {group && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{group}</span>}
            {ex.optional && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Opcional</span>}
            {best && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Melhor: {formatNumber(best.weight)} kg × {best.reps}</span>}
          </div>
          {last && (
            <button type="button" onClick={() => setShowDate(v => !v)} title={last.date} aria-label={`Última vez em ${last.date}: ${last.sets}`}
              className="mt-1.5 block text-left text-sm text-muted">
              Última vez, {showDate ? `em ${last.date}` : last.when}: {last.sets}
            </button>
          )}
          {ex.progression && (
            <p className={`mt-1 text-sm font-semibold ${ex.progression.kind === 'up' ? 'text-success' : ex.progression.kind === 'deload' ? 'text-warning' : 'text-muted'}`}>
              {ex.progression.reason}
            </p>
          )}
        </div>
      </div>

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
              <SwipeRow key={i} enabled={swipe} onCopy={() => update(s => duplicateSet(s, index, i))}
                {...(ex.sets.length > 1 ? { onDelete: () => removeWithUndo(i) } : {})}
                className={`grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-xl ${set.done ? 'bg-success/10' : ''}`}>
                {set.kind === 'warmup' ? (
                  <span className="text-center text-base font-bold text-warning" title="Aquecimento">A</span>
                ) : (
                  // S5: tocar no número marca a série como até a falha ("F")
                  <button type="button" onClick={() => update(s => toggleFailure(s, index, i))} aria-pressed={!!set.failure}
                    aria-label={`Série ${i + 1}: ${set.failure ? 'até a falha (tocar desmarca)' : 'marcar como até a falha'}`}
                    className={`flex h-11 items-center justify-center rounded-lg text-base font-bold ${set.failure ? 'bg-danger/15 text-danger' : 'text-muted'}`}>
                    {set.failure ? 'F' : i + 1 - ex.sets.slice(0, i).filter(s => s.kind === 'warmup').length}
                  </button>
                )}
                <NumberField label={`Carga da série ${i + 1}`} decimal value={set.weight} onChange={v => update(s => updateSet(s, index, i, { weight: v }))} />
                <NumberField label={`${unit} da série ${i + 1}`} value={set.reps} onChange={v => update(s => updateSet(s, index, i, { reps: v }))} />
                <DoneButton done={set.done} label={`Série ${i + 1} feita`} onClick={() => toggle(i)} />
              </SwipeRow>
            ))}
          </ol>
          {removed && (
            <div role="status" className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-1 text-sm">
              <span>Série apagada.</span>
              <button type="button" onClick={undoRemove} className="h-10 px-2 font-bold text-info">Desfazer</button>
            </div>
          )}
          {(data?.settings.weightButtons ?? true) && ex.sets.some(set => !set.done) && (
            <div className="mt-2 flex items-center gap-1" role="group" aria-label={`Ajustar a carga das séries não feitas de ${ex.name}`}>
              <span className="mr-1 text-xs font-semibold text-faint">Carga</span>
              {ADJUSTS.map(d => (
                <button key={d} type="button" onClick={() => { update(s => adjustWeights(s, index, d)); if (d >= 10) run(markBigWeightJump); }}
                  className="h-10 flex-1 rounded-lg bg-surface-2 text-sm font-bold text-muted active:bg-line">
                  {d > 0 ? '+' : '−'}{formatNumber(Math.abs(d))}
                </button>
              ))}
            </div>
          )}
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
          <SheetAction onClick={() => { update(s => addWarmupSet(s, index)); close(); }}><Icon name="mais" />Adicionar série de aquecimento</SheetAction>
          {ex.sets.some(x => x.kind === 'warmup') && (
            <SheetAction onClick={() => { update(s => removeWarmupSet(s, index)); close(); }}><Icon name="menos" />Remover aquecimento</SheetAction>
          )}
          {ex.sets.length > 1 && (
            <SheetAction onClick={() => { update(s => removeSet(s, index, ex.sets.length - 1)); close(); }}><Icon name="menos" />Remover última série</SheetAction>
          )}
        </>}
        {ex.mode === 'reps' && isBarbell(ex.name) && (
          <SheetAction onClick={() => { close(); setPlatesOpen(true); }}><Icon name="treino" />Anilhas na barra</SheetAction>
        )}
        <SheetAction onClick={() => { close(); setSwapOpen(true); }}><Icon name="trocar" />Trocar exercício</SheetAction>
        <SheetAction onClick={() => { setNoteOpen(o => !o); close(); }}><Icon name="nota" />{noteOpen ? 'Esconder observação' : 'Observação'}</SheetAction>
        {hasIllustration(ex.name) && (
          <SheetAction onClick={() => { run((d, now) => updateSettings(d, { showIllustrations: !showIllustrations }, now)); close(); }}>
            <Icon name="treino" />{showIllustrations ? 'Esconder ilustrações' : 'Mostrar ilustrações'}
          </SheetAction>
        )}
        {ex.tip && <SheetAction onClick={() => { setTipOpen(o => !o); close(); }}><Icon name="dica" />{tipOpen ? 'Esconder dica' : 'Ver dica'}</SheetAction>}
      </Sheet>

      {platesOpen && (
        <PlateSheet open onClose={() => setPlatesOpen(false)}
          weight={(ex.sets.find(x => !x.done && x.kind === 'work') ?? ex.sets.find(x => x.kind === 'work') ?? ex.sets[0])?.weight ?? 0} />
      )}

      <Sheet title="Trocar por" open={swapOpen} onClose={() => setSwapOpen(false)}>
        {[...(ex.swappedFrom ? [{ name: ex.swappedFrom, mode: 'reps' as const }] : []), ...ex.alternatives]
          .filter(a => a.name !== ex.name)
          .map(a => (
            <SheetAction key={a.name} onClick={() => { if (data) update(s => swapExercise(s, data, index, a.name)); setSwapOpen(false); }}>
              <ExerciseThumb name={a.name} />{a.name}{a.name === ex.swappedFrom ? ' (original)' : ''}
            </SheetAction>
          ))}
        {(ex.alternatives.length > 0 || ex.swappedFrom) && <p className="mt-3 px-3 text-xs font-semibold text-faint">Ou qualquer exercício:</p>}
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ou digitar o nome" aria-label="Buscar exercício para trocar"
          className="mt-2 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        {(() => {
          const q = query.trim().toLowerCase();
          const pick = (name: string) => { if (data) update(s => swapExercise(s, data, index, name)); setSwapOpen(false); setQuery(''); };
          // S3: sem busca, o que faz sentido no treino de hoje: mesmo grupo, sem repetir exercício do
          // treino, o mesmo movimento primeiro
          const base = ex.swappedFrom ?? ex.name;
          if (!q) {
            const today = session.exercises.filter((_, i) => i !== index).map(e => e.name);
            const { group: g, names: same } = swapSuggestions(base, today, [ex.name, ...ex.alternatives.map(a => a.name)]);
            if (!same.length) return null;
            return (
              <>
                <p className="mt-3 px-3 text-xs font-semibold text-faint">Para o treino de hoje ({g}), sem repetir exercício:</p>
                {same.map(n => <SheetAction key={n} onClick={() => pick(n)}><ExerciseThumb name={n} />{n}</SheetAction>)}
              </>
            );
          }
          const group = guessGroup(base);
          // S6: tolerante a erro, acento, plural e abreviação; o mesmo grupo sobe entre os achados
          const matches = searchNames(q, ALL_NAMES.filter(n => n !== ex.name), 12)
            .map((n, i) => ({ n, i: i - (groupOf(n) === group ? 0.5 : 0) }))
            .sort((a, b) => a.i - b.i).slice(0, 6).map(x => x.n);
          return (
            <>
              {matches.map(n => <SheetAction key={n} onClick={() => pick(n)}><ExerciseThumb name={n} />{n}</SheetAction>)}
              {!matches.some(n => n.toLowerCase() === q) && (
                <SheetAction onClick={() => pick(query)}><Icon name="mais" />Usar “{query.trim()}”</SheetAction>
              )}
            </>
          );
        })()}
        <p className="mt-2 px-3 text-sm text-faint">A troca vale só para este treino; o plano continua igual.</p>
      </Sheet>

      <Sheet title="Conferir a carga" open={check !== null} onClose={() => setCheck(null)}>
        {check && (
          <>
            <p className="text-muted">
              Você digitou <strong className="text-ink">{formatNumber(check.weight)} kg</strong>
              {check.max > 0 ? <>, bem acima do seu melhor registro neste exercício ({formatNumber(check.max)} kg).</> : '.'}
              {' '}Um valor errado vira recorde e achata o gráfico de evolução.
            </p>
            <div className="mt-4 space-y-2">
              {check.suggestion !== null && (
                <button type="button" className="h-12 w-full rounded-xl bg-primary font-bold text-white" onClick={() => {
                  update(s => updateSet(s, index, check.set, { weight: check.suggestion! }));
                  setCheck(null);
                  toggle(check.set, true);
                }}>Corrigir para {formatNumber(check.suggestion)} kg</button>
              )}
              <button type="button" className="h-12 w-full rounded-xl bg-surface-2 font-bold" onClick={() => { setCheck(null); toggle(check.set, true); }}>
                Está correto
              </button>
              <button type="button" className="h-11 w-full font-semibold text-muted" onClick={() => setCheck(null)}>Voltar e corrigir</button>
            </div>
          </>
        )}
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
