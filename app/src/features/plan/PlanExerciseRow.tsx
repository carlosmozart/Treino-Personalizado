// Uma linha de exercício no Plano, recolhida ou aberta para editar. Saiu de PlanScreen.tsx (X13).
import { useId, useState } from 'react';
import { type PlanExercise } from '../../domain/model';
import { EXERCISE_LIBRARY } from '../../data/exercise-library';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { LockMark } from '../../ui/LockMark';
import { NumberField } from '../../ui/NumberField';
import { INCREMENTS, editRange, rangeFields, repRange, settleRange } from '../../domain/progression';
import { SwipeRow } from '../../ui/SwipeRow';
import { formatClock, formatNumber } from '../../ui/format';
import { RestSheet, restLabel } from '../../ui/RestSheet';
import { StackField } from './StackField';

/** Todos os nomes da biblioteca, para a lista de sugestões ao trocar o nome de um exercício. */
export const ALL_NAMES = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

/** Resumo do exercício recolhido; o descanso só aparece quando é diferente do padrão do app. */
export function summary(ex: PlanExercise, defaultRest: number): string {
  if (ex.mode === 'cardio') return `${ex.minutes} min${ex.km ? ` · ${formatNumber(ex.km)} km` : ''}`;
  const rest = ex.restSeconds === undefined || ex.restSeconds === defaultRest ? '' : ` · descanso ${ex.restSeconds === 0 ? 'sem cronômetro' : formatClock(ex.restSeconds)}`;
  if (ex.mode === 'time') return `${ex.sets} × ${ex.seconds ?? 30} s${rest}`;
  const { min, max } = repRange(ex);
  const warm = `${ex.warmupSets ? ` · ${ex.warmupSets} aquec.` : ''}${ex.stack?.length ? ' · pilha' : ''}`;
  return `${ex.sets} × ${min === max ? max : `${min}–${max}`}${ex.perSide ? ' por lado' : ''}${ex.weight ? ` · ${formatNumber(ex.weight)} kg` : ''}${warm}${rest}`;
}

export interface RowProps {
  ex: PlanExercise; open: boolean; first: boolean; last: boolean; swipe: boolean;
  superset: { pos: number; size: number } | null; linkedToNext: boolean; onToggleSuperset: () => void;
  onSwipeRemove: () => void; onDuplicate: () => void;
  onToggle: () => void; onChange: (patch: Partial<PlanExercise>) => void; onMove: (delta: -1 | 1) => void; onRemove: () => void;
  /** Descanso do exercício: `undefined` = o padrão do app, 0 = sem cronômetro. */
  onRest: (seconds: number | undefined) => void;
  onAddAlt: (name: string) => void; onRemoveAlt: (index: number) => void;
}

/** Exercício recolhido; ao tocar abre os campos (O25). */
export function ExerciseRow({ ex, open, first, last, swipe, superset, linkedToNext, onToggleSuperset, onSwipeRemove, onDuplicate, onToggle, onChange, onMove, onRemove, onRest, onAddAlt, onRemoveAlt }: RowProps) {
  const [alt, setAlt] = useState('');
  const [restOpen, setRestOpen] = useState(false);
  const defaultRest = useAppStore(s => s.data?.settings.restSeconds ?? 90);
  // faixa de reps (M10): cada campo grava o seu número a cada tecla; inversão só se acerta ao sair do campo
  const settle = (side: 'min' | 'max') => { const patch = settleRange(ex, side); if (patch) onChange(patch); };
  const listId = useId();
  const field = (label: string, value: number, set: (n: number) => void, decimal = false, commit?: () => void) => (
    <label className="text-xs font-semibold text-muted">{label}
      <NumberField label={`${label} de ${ex.name}`} decimal={decimal} value={value} onChange={set} onCommit={commit} className="mt-1" />
    </label>
  );
  return (
    <SwipeRow enabled={swipe} onDelete={onSwipeRemove} onCopy={onDuplicate} className="py-1">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold"><span className="truncate">{ex.name}</span>{ex.lockWeight && ex.mode !== 'cardio' && <LockMark className="size-4" />}</span>
          <span className="block text-sm text-muted">{summary(ex, defaultRest)}{superset ? ` · superset ${superset.pos}/${superset.size}` : ''}</span>
        </span>
        <Icon name={open ? 'subir' : 'descer'} className="size-5 shrink-0 text-faint" />
      </button>
      {open && (
        <div className="pb-3">
          <div className="grid grid-cols-3 gap-2">
            {ex.mode === 'cardio' ? (
              <>{field('Minutos', ex.minutes, minutes => onChange({ minutes }))}{field('Km', ex.km, km => onChange({ km }), true)}</>
            ) : (
              <>
                {field('Séries', ex.sets, sets => onChange({ sets: Math.max(1, Math.round(sets)) }))}
                {ex.mode === 'time'
                  ? field('Segundos', ex.seconds ?? 30, seconds => onChange({ seconds }))
                  : <>
                    {field('Reps mín.', rangeFields(ex).min, n => onChange(editRange(ex, 'min', n)), false, () => settle('min'))}
                    {field('Reps máx.', rangeFields(ex).max, n => onChange(editRange(ex, 'max', n)), false, () => settle('max'))}
                  </>}
                {ex.mode === 'time' && field('Carga (kg)', ex.weight, weight => onChange({ weight }), true)}
              </>
            )}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ex.mode === 'reps' && (
              <>
                {field('Carga (kg)', ex.weight, weight => onChange({ weight }), true)}
                <label className="text-xs font-semibold text-muted">Subir (kg)
                  <select value={ex.increment || ''} onChange={e => onChange(e.target.value ? { increment: Number(e.target.value) } : { increment: 0 })} aria-label={`Quanto subir a carga de ${ex.name}`}
                    className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-2 text-base text-ink">
                    {/* Auto: 1 kg abaixo de 20 kg e 2,5 kg a partir daí (incrementFor) */}
                    <option value="">Auto</option>
                    {INCREMENTS.map(n => <option key={n} value={n}>{formatNumber(n)}</option>)}
                  </select>
                </label>
              </>
            )}
            <div className="text-xs font-semibold text-muted">Descanso
              <button type="button" onClick={() => setRestOpen(true)} aria-label={`Descanso de ${ex.name}: ${restLabel(ex.restSeconds, defaultRest)}. Mudar`}
                className="mt-1 flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 px-2 text-base font-normal text-ink">
                <Icon name="relogio" className="size-4 text-muted" />{ex.restSeconds === undefined ? formatClock(defaultRest) : ex.restSeconds === 0 ? 'Sem' : formatClock(ex.restSeconds)}
              </button>
            </div>
            <RestSheet open={restOpen} title={ex.name} seconds={ex.restSeconds} fallback={defaultRest} onClose={() => setRestOpen(false)} onSave={s => onRest(s)} />
          </div>
          <label className="mt-2 block text-xs font-semibold text-muted">Dica
            <input value={ex.tip ?? ''} placeholder="Execução ou substituição" onChange={e => onChange({ tip: e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
          </label>
          {!last && (
            <button type="button" onClick={onToggleSuperset}
              className="mt-3 h-11 w-full rounded-xl bg-surface-2 text-sm font-semibold">
              {linkedToNext ? 'Separar do próximo (superset)' : 'Superset com o próximo exercício'}
            </button>
          )}
          <label className="mt-3 flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={ex.optional} onChange={e => onChange({ optional: e.target.checked })} className="size-5 accent-[var(--color-primary)]" />
            <span className="text-sm font-semibold">Exercício opcional</span>
          </label>
          {ex.mode !== 'cardio' && (
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={!!ex.lockWeight} onChange={e => onChange(e.target.checked ? { lockWeight: true } : { lockWeight: undefined })} className="size-5 accent-[var(--color-primary)]" />
              <span className="text-sm font-semibold">Travar a carga <span className="font-normal text-muted">(o treino abre com a carga acima e a progressão não muda)</span></span>
            </label>
          )}
          {ex.mode === 'reps' && (
            <div className="grid grid-cols-3 gap-2">
              {field('Aquecimento (séries)', ex.warmupSets ?? 0, n => onChange({ warmupSets: Math.max(0, Math.min(5, Math.round(n))) }))}
              <p className="col-span-2 self-end pb-1 text-xs text-faint">Séries de aquecimento no começo, com metade da carga e 10 repetições.</p>
            </div>
          )}
          {ex.mode === 'reps' && (
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={!!ex.perSide} onChange={e => onChange({ perSide: e.target.checked })} className="size-5 accent-[var(--color-primary)]" />
              <span className="text-sm font-semibold">Repetições por lado <span className="font-normal text-muted">(afundo, unilateral)</span></span>
            </label>
          )}
          {ex.mode === 'reps' && ex.perSide && (
            <div className="grid grid-cols-3 gap-2">
              {field('Entre os lados (s)', ex.sideRestSeconds ?? 0, n => onChange({ sideRestSeconds: Math.max(0, Math.round(n)) }))}
              <p className="col-span-2 self-end pb-1 text-xs text-faint">Descanso curto entre um lado e o outro; 0 = sem. No treino vira o botão "Trocar de lado".</p>
            </div>
          )}
          {ex.mode === 'reps' && <StackField ex={ex} onChange={onChange} />}
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted">Reservas (para trocar no treino)</p>
            {ex.alternatives.map((a, i) => (
              <div key={`${a.name}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{a.name}</span>
                <button type="button" onClick={() => onRemoveAlt(i)} aria-label={`Remover reserva ${a.name}`} className="flex size-11 shrink-0 items-center justify-center text-muted">
                  <Icon name="fechar" className="size-5" />
                </button>
              </div>
            ))}
            <form className="mt-1 flex gap-2" onSubmit={e => { e.preventDefault(); if (alt.trim()) { onAddAlt(alt); setAlt(''); } }}>
              <input value={alt} onChange={e => setAlt(e.target.value)} list={listId} placeholder="Nome da reserva" aria-label={`Reserva de ${ex.name}`}
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
              <datalist id={listId}>{ALL_NAMES.map(n => <option key={n} value={n} />)}</datalist>
              <button type="submit" className="h-11 shrink-0 rounded-xl bg-surface-2 px-3 font-semibold">Adicionar</button>
            </form>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label={`Subir ${ex.name}`}
              className="flex size-11 items-center justify-center rounded-xl bg-surface-2 disabled:opacity-40"><Icon name="subir" /></button>
            <button type="button" disabled={last} onClick={() => onMove(1)} aria-label={`Descer ${ex.name}`}
              className="flex size-11 items-center justify-center rounded-xl bg-surface-2 disabled:opacity-40"><Icon name="descer" /></button>
            <button type="button" onClick={onRemove} aria-label={`Remover ${ex.name}`}
              className="ml-auto flex h-11 items-center gap-2 rounded-xl px-3 font-semibold text-danger"><Icon name="lixo" className="size-5" /> Remover</button>
          </div>
        </div>
      )}
    </SwipeRow>
  );
}
