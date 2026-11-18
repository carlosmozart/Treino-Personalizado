// O cartão de um dia (ou de um treino da rotação) no Plano. Saiu de PlanScreen.tsx (X13).
import { collapseKey, type CollapsedDays } from './plan-collapse';
import { useState } from 'react';
import { type DayKey } from '../../domain/ai-plan';
import { newId } from '../../domain/ids';
import { DAY_FULL_NAMES, MAX_EXERCISES_PER_DAY, type Plan, type PlanExercise } from '../../domain/model';
import { addAlternative, addExercise, duplicateExercise, insertExercise, clearDay, isPlannedEmpty, moveExercise, newPlanExercise, optionalHint, removeAlternative, removeExercise, setPlanExerciseRest, updateDay, updateExercise } from '../../domain/plan-edit';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { supersetBlock, toggleSupersetWithNext } from '../../domain/session';
import { rotationTitle } from '../../domain/rotation';
import { dayTitle, plural } from '../../ui/format';
import { type Edit } from './PlanRotation';
import { ExerciseRow } from './PlanExerciseRow';
import { AddExerciseSheet } from './AddExerciseSheet';

export function DayCard({ plan, dayKey, today, edit, rotation, collapsed }: { plan: Plan; dayKey: DayKey; today: boolean; edit: Edit; rotation?: { letter: string; next?: string }; collapsed: CollapsedDays }) {
  const day = plan.days[dayKey];
  const { title, optional } = dayTitle(day, dayKey);
  const rest = day.exercises.length === 0;
  // dia escolhido para treinar, ainda sem exercícios (plano do zero) ou o próximo treino da rotação
  const waiting = rest && (rotation ? true : isPlannedEmpty(day));
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dayMenu, setDayMenu] = useState(false);
  // R2: deslizar o exercício (esquerda remove com Desfazer, direita duplica)
  const swipe = useAppStore(s => s.data?.settings.swipeSets ?? true);
  // W14: os números iniciais de exercício novo
  const startSets = useAppStore(s => s.data?.settings.newExerciseSets);
  const startReps = useAppStore(s => s.data?.settings.newExerciseReps);
  const [removed, setRemoved] = useState<{ at: number; ex: PlanExercise; timer: number } | null>(null);
  const removeWithUndo = (i: number) => {
    const ex = day.exercises[i];
    if (!ex) return;
    if (removed) clearTimeout(removed.timer);
    if (openId === ex.id) setOpenId(null);
    edit(p => removeExercise(p, dayKey, ex.id));
    setRemoved({ at: i, ex, timer: window.setTimeout(() => setRemoved(null), 5000) });
  };
  const undoRemove = () => {
    if (!removed) return;
    clearTimeout(removed.timer);
    edit(p => insertExercise(p, dayKey, removed.at, removed.ex));
    setRemoved(null);
  };
  const full = day.exercises.length >= MAX_EXERCISES_PER_DAY;
  // na rotação o espaço é "Treino B" (vazio: "Treino novo"), não o dia da semana
  const slotName = rotation ? (rotation.letter ? `Treino ${rotation.letter}` : rotation.next ? `Treino ${rotation.next}` : 'Treino novo') : DAY_FULL_NAMES[dayKey];
  const tags = [slotName, today ? 'Hoje' : '', optional && !rest && !rotation ? 'Opcional' : ''].filter(Boolean).join(' · ');
  // X6: o dia de descanso ocupa uma linha só; o treino pode ser recolhido (fica o título e a contagem)
  const compactRest = rest && !waiting;
  const foldId = collapseKey(plan.id, dayKey);
  const folded = !rest && collapsed.has(foldId);
  const addLabel = full ? `Limite de ${MAX_EXERCISES_PER_DAY} exercícios` : rest && !waiting ? 'Adicionar exercício (vira dia de treino)' : 'Adicionar exercício';

  return (
    <article aria-label={slotName} className={`rounded-2xl border bg-surface ${compactRest ? 'px-4 py-2' : 'p-4'} ${today ? 'border-primary' : waiting ? 'border-dashed border-primary/60' : 'border-line'}`}>
      <div className={`flex gap-2 ${compactRest ? 'items-center' : 'items-start'}`}>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted">{tags}</p>
          <h2 className="text-lg font-bold leading-snug">
            {rest ? (rotation ? (day.name.trim() || 'Novo treino da rotação') : waiting ? title : 'Descanso')
              : rotation ? rotationTitle(plan, dayKey)
              : title.replace(new RegExp(`^${DAY_FULL_NAMES[dayKey]}:\\s*`, 'i'), '') || title}
          </h2>
          {!rest && day.focus && <p className="text-sm text-muted">{day.focus}</p>}
          {folded && <p className="text-sm text-muted" data-testid="treino-recolhido">{plural(day.exercises.length, 'exercício', 'exercícios')}</p>}
          {waiting && <p className="text-sm text-muted">{rotation ? 'Adicione exercícios para criar este treino.' : 'Ainda sem exercícios.'}</p>}
        </div>
        {compactRest && (
          <button type="button" disabled={full} onClick={() => setAdding(true)} aria-label={addLabel}
            className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-dashed border-line px-3 text-sm font-semibold text-muted">
            <Icon name="mais" className="size-4" />Exercício
          </button>
        )}
        {!rest && (
          <button type="button" onClick={() => collapsed.toggle(foldId)} aria-expanded={!folded} aria-label={`${folded ? 'Abrir' : 'Recolher'} ${slotName}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted">
            <Icon name={folded ? 'descer' : 'subir'} className="size-5" />
          </button>
        )}
        <button type="button" onClick={() => setDayMenu(true)} aria-label={`Editar ${slotName}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted">
          <Icon name="editar" />
        </button>
      </div>

      {!rest && !folded && (
        <ul className="mt-3 divide-y divide-line">
          {day.exercises.map((ex, i) => (
            <ExerciseRow key={ex.id} ex={ex} open={openId === ex.id} first={i === 0} last={i === day.exercises.length - 1} swipe={swipe}
              onSwipeRemove={() => removeWithUndo(i)}
              superset={(() => { const b = supersetBlock(day.exercises, i); return b ? { pos: i - b.start + 1, size: b.end - b.start + 1 } : null; })()}
              linkedToNext={!!ex.superset && ex.superset === day.exercises[i + 1]?.superset}
              onToggleSuperset={() => edit(p => ({ ...p, days: { ...p.days, [dayKey]: { ...p.days[dayKey], exercises: toggleSupersetWithNext(p.days[dayKey].exercises, i, () => newId('ss')) } } }))}
              onDuplicate={() => edit(p => duplicateExercise(p, dayKey, ex.id, newId('ex')))}
              onToggle={() => setOpenId(openId === ex.id ? null : ex.id)}
              onRest={seconds => edit(p => setPlanExerciseRest(p, dayKey, ex.id, seconds))}
              onChange={patch => edit(p => updateExercise(p, dayKey, ex.id, patch))}
              onMove={delta => edit(p => moveExercise(p, dayKey, ex.id, delta))}
              onRemove={() => { setOpenId(null); edit(p => removeExercise(p, dayKey, ex.id)); }}
              onAddAlt={name => edit(p => addAlternative(p, dayKey, ex.id, name))}
              onRemoveAlt={i => edit(p => removeAlternative(p, dayKey, ex.id, i))} />
          ))}
        </ul>
      )}
      {removed && (
        <div role="status" className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-1 text-sm">
          <span className="min-w-0 truncate">{removed.ex.name} removido.</span>
          <button type="button" onClick={undoRemove} className="h-10 shrink-0 px-2 font-bold text-info">Desfazer</button>
        </div>
      )}

      {!compactRest && !folded && (
        <button type="button" disabled={full} onClick={() => setAdding(true)}
          className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-50 ${waiting ? 'bg-primary text-white' : 'border border-dashed border-line text-muted'}`}>
          <Icon name="mais" className="size-5" /> {addLabel}
        </button>
      )}

      {/* vários de uma vez: o painel fica aberto até "Pronto" */}
      <AddExerciseSheet open={adding} dayName={slotName} existing={day.exercises.map(e => e.name)} full={full} onClose={() => setAdding(false)}
        onAdd={name => { const ex = newPlanExercise(name, undefined, { sets: startSets, reps: startReps }); edit(p => addExercise(p, dayKey, ex)); setOpenId(ex.id); }} />

      <Sheet title={slotName} open={dayMenu} onClose={() => setDayMenu(false)}>
        <label className="block text-sm font-semibold text-muted">Nome do treino
          <input value={day.name} placeholder={slotName} onChange={e => edit(p => updateDay(p, dayKey, { name: e.target.value }))}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        </label>
        <label className="mt-3 block text-sm font-semibold text-muted">Foco
          <input value={day.focus} placeholder="Ex.: peito e tríceps" onChange={e => edit(p => updateDay(p, dayKey, { focus: e.target.value }))}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        </label>
        <label className="mt-3 flex min-h-12 items-center gap-3">
          <input type="checkbox" checked={day.optional} className="size-6 accent-[var(--color-primary)]"
            onChange={e => edit(p => updateDay(p, dayKey, { optional: e.target.checked }))} />
          <span className="font-semibold">Dia opcional</span>
        </label>
        <p className="text-sm text-muted">{optionalHint(day.optional)}</p>
        {!rest && (
          <div className="mt-3">
            <SheetAction tone="danger" onClick={() => {
              if (confirm(rotation ? `Esvaziar ${slotName}? Os exercícios serão removidos e ele sai da rotação.` : `Transformar ${DAY_FULL_NAMES[dayKey]} em descanso? Os exercícios do dia serão removidos.`)) { edit(p => clearDay(p, dayKey)); setDayMenu(false); }
            }}>
              <Icon name="lixo" /> {rotation ? 'Esvaziar treino' : 'Transformar em descanso'}
            </SheetAction>
          </div>
        )}
      </Sheet>
    </article>
  );
}
