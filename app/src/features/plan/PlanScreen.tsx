import { useId, useState } from 'react';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { addPlan, setActivePlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { DAY_FULL_NAMES, MAX_EXERCISES_PER_DAY, dayKeyOf, trainingDaysPerWeek, type Plan, type PlanExercise } from '../../domain/model';
import {
  addAlternative, addExercise, duplicateExercise, insertExercise, blankPlan, clearDay, deletePlan, duplicatePlan, editPlan, moveExercise, newPlanExercise, optionalHint,
  removeAlternative, removeExercise, updateDay, updateExercise
} from '../../domain/plan-edit';
import { EXERCISE_LIBRARY } from '../../data/exercise-library';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { ExerciseThumb } from '../../ui/ExerciseIllustration';
import { AiPlanSheet } from './AiPlanSheet';
import { TemplateSheet } from './TemplateSheet';
import { NumberField } from '../../ui/NumberField';
import { DEFAULT_INCREMENT, INCREMENTS, repRange } from '../../domain/progression';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { SwipeRow } from '../../ui/SwipeRow';
import { searchNames } from '../../domain/search';
import { supersetBlock, toggleSupersetWithNext } from '../../domain/session';
import { useSearchPool } from '../../hooks/use-search-pool';
import { disableRotation, enableRotation, moveInRotation, restartRotation, rotationLetter, rotationOrder, rotationState, rotationTitle, setRotationPerWeek } from '../../domain/rotation';
import { dayTitle, formatNumber, plural } from '../../ui/format';

const ALL_NAMES = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

/** Plano em cartões por dia, com descanso explícito e edição no próprio cartão (N10, O25). */
export function PlanScreen() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [plansOpen, setPlansOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;

  if (!data) return null;
  if (!plan) {
    return (
      <>
        <h1 className="pt-6 text-3xl font-black tracking-tight">Plano</h1>
        <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-lg font-bold">Você ainda não tem um plano</h2>
          <p className="mt-1 text-muted">Comece por um modelo pronto (corpo inteiro, ABC, superior/inferior, em casa…) e ajuste os dias aqui.</p>
          <button type="button" onClick={() => setTemplatesOpen(true)} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
            Escolher um modelo
          </button>
          <button type="button" onClick={() => setAiOpen(true)} className="mt-2 h-12 w-full rounded-xl bg-surface-2 text-base font-bold">
            Montar treino com IA
          </button>
        </section>
        {/* mesma chave nos dois retornos: o painel continua aberto quando o plano criado vira o ativo */}
        <AiPlanSheet key="ai" open={aiOpen} onClose={() => setAiOpen(false)} />
        <TemplateSheet key="modelos" open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      </>
    );
  }

  const edit = (fn: (p: Plan) => Plan) => run((d, now) => editPlan(d, plan.id, fn, now));
  const days = trainingDaysPerWeek(plan);
  const today = dayKeyOf(new Date());
  const others = Object.values(data.plans).filter(p => p.id !== plan.id);

  return (
    <>
      <div className="flex items-end justify-between gap-3 pt-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight">Plano</h1>
          <p className="truncate text-muted">{plan.name}</p>
        </div>
        <button type="button" onClick={() => setPlansOpen(true)} className="h-11 shrink-0 rounded-xl bg-surface-2 px-4 font-semibold">
          Planos
        </button>
      </div>
      <div role="radiogroup" aria-label="Como o plano anda" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {([['week', 'Semana fixa'], ['rotation', 'Rotação A/B/C']] as const).map(([mode, label]) => {
          const on = (mode === 'rotation') === !!plan.rotation;
          return (
            <button key={mode} type="button" role="radio" aria-checked={on}
              onClick={() => {
                if (on) return;
                if (mode === 'rotation') edit(enableRotation);
                else if (confirm('Voltar para a semana fixa? Cada treino volta ao seu dia da semana.')) edit(disableRotation);
              }}
              className={`min-h-11 rounded-lg text-sm font-semibold ${on ? 'bg-primary text-white' : 'text-muted'}`}>
              {label}
            </button>
          );
        })}
      </div>
      {plan.rotation ? <RotationPanel plan={plan} edit={edit} /> : (
        /* O3: calculado pelos dias obrigatórios com exercícios, sem campo manual */
        <p className="mt-2 text-sm text-muted" data-testid="dias-semana">{plural(days, 'dia de treino', 'dias de treino')} por semana</p>
      )}

      <div className="mt-4 space-y-3">
        {plan.rotation
          ? rotationSlots(plan).map(({ key, letter, first, last }) => (
              <DayCard key={key} plan={plan} dayKey={key} today={false} edit={edit} rotation={{ letter, first, last }} />
            ))
          : DAY_KEYS.map(k => <DayCard key={k} plan={plan} dayKey={k} today={k === today} edit={edit} />)}
      </div>

      <Sheet title="Planos" open={plansOpen} onClose={() => setPlansOpen(false)}>
        <div className="space-y-3 pb-3">
          <label className="block text-sm font-semibold text-muted">Nome do plano
            <input value={plan.name} onChange={e => edit(p => ({ ...p, name: e.target.value }))}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
          </label>
          <label className="block text-sm font-semibold text-muted">Descrição
            <textarea value={plan.description} rows={2} maxLength={500} onChange={e => edit(p => ({ ...p, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-base text-ink" />
          </label>
          <label className="block text-sm font-semibold text-muted">Horário do treino
            <input type="time" value={plan.trainingTime} onChange={e => edit(p => ({ ...p, trainingTime: e.target.value }))}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
            <span className="mt-1 block text-xs font-normal text-faint">Usado nos lembretes dos dias de treino (Perfil → Treino).</span>
          </label>
          {/* M10: como a carga sugerida sobe neste plano */}
          <div>
            <p className="text-sm font-semibold text-muted">Progressão de carga</p>
            <div role="radiogroup" aria-label="Progressão de carga" className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              {([['double', 'Dupla'], ['linear', 'Linear']] as const).map(([id, label]) => {
                const on = (plan.progression ?? 'double') === id;
                return (
                  <button key={id} type="button" role="radio" aria-checked={on}
                    onClick={() => edit(p => (id === 'double' ? (({ progression: _p, ...rest }) => rest)(p) : { ...p, progression: 'linear' }))}
                    className={`min-h-11 rounded-lg text-sm font-semibold ${on ? 'bg-primary text-white' : 'text-muted'}`}>{label}</button>
                );
              })}
            </div>
            <span className="mt-1 block text-xs text-faint">
              {plan.progression === 'linear'
                ? 'Linear: completou todas as séries nas reps do plano, a carga sobe no próximo treino. Boa para iniciantes.'
                : 'Dupla: primeiro as repetições sobem até o topo da faixa (ex.: 8–12), depois a carga.'}
            </span>
          </div>
        </div>
        {others.length > 0 && <p className="px-3 pb-1 pt-2 text-sm font-semibold text-muted">Outros planos</p>}
        {others.map(p => (
          <div key={p.id} className="flex items-center gap-2">
            <SheetAction onClick={() => { run((d, now) => setActivePlan(d, p.id, now)); setPlansOpen(false); }}>
              Usar “{p.name}”
            </SheetAction>
            <button type="button" aria-label={`Apagar ${p.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-danger"
              onClick={() => { if (confirm(`Apagar o plano “${p.name}”?`)) run((d, now) => deletePlan(d, p.id, now)); }}>
              <Icon name="lixo" />
            </button>
          </div>
        ))}
        <SheetAction onClick={() => { setPlansOpen(false); setAiOpen(true); }}>
          <Icon name="dica" /> Montar treino com IA
        </SheetAction>
        <SheetAction onClick={() => { run((d, now) => addPlan(d, duplicatePlan(plan, newId('plano'), toDateKey(now)), now)); setPlansOpen(false); }}>
          <Icon name="mais" /> Duplicar este plano
        </SheetAction>
        <SheetAction onClick={() => { run((d, now) => addPlan(d, blankPlan(newId('plano'), toDateKey(now)), now)); setPlansOpen(false); }}>
          <Icon name="mais" /> Novo plano em branco
        </SheetAction>
        <SheetAction onClick={() => { setPlansOpen(false); setTemplatesOpen(true); }}>
          <Icon name="mais" /> Novo plano a partir de um modelo
        </SheetAction>
      </Sheet>
      <AiPlanSheet key="ai" open={aiOpen} onClose={() => setAiOpen(false)} />
      <TemplateSheet key="modelos" open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </>
  );
}

type Edit = (fn: (p: Plan) => Plan) => void;

/** Espaços na ordem da rotação e, no fim, um vazio para criar o próximo treino (máximo 7). */
function rotationSlots(plan: Plan) {
  const order = rotationOrder(plan);
  const empty = DAY_KEYS.find(k => !order.includes(k));
  return [
    ...order.map((key, i) => ({ key, letter: rotationLetter(plan, key), first: i === 0, last: i === order.length - 1 })),
    ...(empty ? [{ key: empty, letter: '', first: true, last: true }] : [])
  ];
}

/** Rotação (R1): meta por semana, onde está a volta e recomeçar do A. */
function RotationPanel({ plan, edit }: { plan: Plan; edit: Edit }) {
  const workouts = useAppStore(s => s.data?.workouts);
  const rot = rotationState(plan, workouts ?? []);
  if (!plan.rotation) return null;
  return (
    <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">
        O próximo treino é o seguinte ao último feito, em qualquer dia da semana.
        {rot ? ` Próximo: treino ${rotationLetter(plan, rot.next)} (${rot.done} de ${rot.order.length} da volta).` : ' Adicione exercícios a um treino para começar.'}
      </p>
      <div className="mt-3 flex items-end gap-3">
        <label className="w-32 text-xs font-semibold text-muted">Treinos por semana
          <NumberField label="Meta de treinos por semana" value={plan.rotation.perWeek} onChange={n => { if (n >= 1 && n <= 7) edit(p => setRotationPerWeek(p, n)); }} className="mt-1" />
        </label>
        <button type="button" disabled={!rot || rot.done === 0} onClick={() => { if (confirm('Recomeçar a rotação pelo treino A?')) edit(p => restartRotation(p, new Date())); }}
          className="h-11 rounded-xl bg-surface-2 px-4 font-semibold disabled:opacity-40">
          Recomeçar do A
        </button>
      </div>
      <p className="mt-2 text-xs text-faint">A meta vale para a semana, o XP e a sequência. Com os lembretes ligados (Perfil → Treino), o aviso diário diz qual é o próximo treino.</p>
    </section>
  );
}

function DayCard({ plan, dayKey, today, edit, rotation }: { plan: Plan; dayKey: DayKey; today: boolean; edit: Edit; rotation?: { letter: string; first: boolean; last: boolean } }) {
  const day = plan.days[dayKey];
  const { title, optional } = dayTitle(day, dayKey);
  const rest = day.exercises.length === 0;
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dayMenu, setDayMenu] = useState(false);
  // R2: deslizar o exercício (esquerda remove com Desfazer, direita duplica)
  const swipe = useAppStore(s => s.data?.settings.swipeSets ?? true);
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
  const slotName = rotation ? (rotation.letter ? `Treino ${rotation.letter}` : 'Treino novo') : DAY_FULL_NAMES[dayKey];
  const tags = [slotName, today ? 'Hoje' : '', optional && !rest && !rotation ? 'Opcional' : ''].filter(Boolean).join(' · ');

  return (
    <article aria-label={slotName} className={`rounded-2xl border bg-surface p-4 ${today ? 'border-primary' : 'border-line'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted">{tags}</p>
          <h2 className="text-lg font-bold leading-snug">
            {rest ? (rotation ? 'Vazio: adicione exercícios para incluir na rotação' : 'Descanso')
              : rotation ? rotationTitle(plan, dayKey)
              : title.replace(new RegExp(`^${DAY_FULL_NAMES[dayKey]}:\\s*`, 'i'), '') || title}
          </h2>
          {!rest && day.focus && <p className="text-sm text-muted">{day.focus}</p>}
        </div>
        {rotation?.letter && (
          <>
            <button type="button" disabled={rotation.first} onClick={() => edit(p => moveInRotation(p, dayKey, -1))} aria-label={`Subir ${slotName} na rotação`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted disabled:opacity-30">
              <Icon name="subir" />
            </button>
            <button type="button" disabled={rotation.last} onClick={() => edit(p => moveInRotation(p, dayKey, 1))} aria-label={`Descer ${slotName} na rotação`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted disabled:opacity-30">
              <Icon name="descer" />
            </button>
          </>
        )}
        <button type="button" onClick={() => setDayMenu(true)} aria-label={`Editar ${slotName}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted">
          <Icon name="editar" />
        </button>
      </div>

      {!rest && (
        <ul className="mt-3 divide-y divide-line">
          {day.exercises.map((ex, i) => (
            <ExerciseRow key={ex.id} ex={ex} open={openId === ex.id} first={i === 0} last={i === day.exercises.length - 1} swipe={swipe}
              onSwipeRemove={() => removeWithUndo(i)}
              superset={(() => { const b = supersetBlock(day.exercises, i); return b ? { pos: i - b.start + 1, size: b.end - b.start + 1 } : null; })()}
              linkedToNext={!!ex.superset && ex.superset === day.exercises[i + 1]?.superset}
              onToggleSuperset={() => edit(p => ({ ...p, days: { ...p.days, [dayKey]: { ...p.days[dayKey], exercises: toggleSupersetWithNext(p.days[dayKey].exercises, i, () => newId('ss')) } } }))}
              onDuplicate={() => edit(p => duplicateExercise(p, dayKey, ex.id, newId('ex')))}
              onToggle={() => setOpenId(openId === ex.id ? null : ex.id)}
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

      <button type="button" disabled={full} onClick={() => setAdding(true)}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line font-semibold text-muted disabled:opacity-50">
        <Icon name="mais" className="size-5" /> {full ? `Limite de ${MAX_EXERCISES_PER_DAY} exercícios` : 'Adicionar exercício'}
      </button>

      <AddExerciseSheet open={adding} dayName={slotName} onClose={() => setAdding(false)}
        onAdd={name => { const ex = newPlanExercise(name); edit(p => addExercise(p, dayKey, ex)); setOpenId(ex.id); setAdding(false); }} />

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

function summary(ex: PlanExercise): string {
  if (ex.mode === 'cardio') return `${ex.minutes} min${ex.km ? ` · ${formatNumber(ex.km)} km` : ''}`;
  if (ex.mode === 'time') return `${ex.sets} × ${ex.seconds ?? 30} s`;
  const { min, max } = repRange(ex);
  return `${ex.sets} × ${min === max ? max : `${min}–${max}`}${ex.weight ? ` · ${formatNumber(ex.weight)} kg` : ''}`;
}

interface RowProps {
  ex: PlanExercise; open: boolean; first: boolean; last: boolean; swipe: boolean;
  superset: { pos: number; size: number } | null; linkedToNext: boolean; onToggleSuperset: () => void;
  onSwipeRemove: () => void; onDuplicate: () => void;
  onToggle: () => void; onChange: (patch: Partial<PlanExercise>) => void; onMove: (delta: -1 | 1) => void; onRemove: () => void;
  onAddAlt: (name: string) => void; onRemoveAlt: (index: number) => void;
}

/** Exercício recolhido; ao tocar abre os campos (O25). */
function ExerciseRow({ ex, open, first, last, swipe, superset, linkedToNext, onToggleSuperset, onSwipeRemove, onDuplicate, onToggle, onChange, onMove, onRemove, onAddAlt, onRemoveAlt }: RowProps) {
  const [alt, setAlt] = useState('');
  const listId = useId();
  const field = (label: string, value: number, set: (n: number) => void, decimal = false) => (
    <label className="text-xs font-semibold text-muted">{label}
      <NumberField label={`${label} de ${ex.name}`} decimal={decimal} value={value} onChange={set} className="mt-1" />
    </label>
  );
  return (
    <SwipeRow enabled={swipe} onDelete={onSwipeRemove} onCopy={onDuplicate} className="py-1">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{ex.name}</span>
          <span className="block text-sm text-muted">{summary(ex)}{superset ? ` · superset ${superset.pos}/${superset.size}` : ''}</span>
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
                    {field('Reps mín.', repRange(ex).min, n => onChange(rangePatch(n, repRange(ex).max)))}
                    {field('Reps máx.', repRange(ex).max, n => onChange(rangePatch(repRange(ex).min, n)))}
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
                  <select value={ex.increment ?? DEFAULT_INCREMENT} onChange={e => onChange({ increment: Number(e.target.value) })} aria-label={`Quanto subir a carga de ${ex.name}`}
                    className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-2 text-base text-ink">
                    {INCREMENTS.map(n => <option key={n} value={n}>{formatNumber(n)}</option>)}
                  </select>
                </label>
              </>
            )}
            {field('Descanso (s)', ex.restSeconds ?? 90, restSeconds => onChange({ restSeconds }))}
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

function AddExerciseSheet({ open, dayName, onClose, onAdd }: { open: boolean; dayName: string; onClose: () => void; onAdd: (name: string) => void }) {
  const [query, setQuery] = useState('');
  const listId = useId();
  const q = query.trim().toLowerCase();
  const pool = useSearchPool();
  const matches = q ? searchNames(q, pool.names, 6, pool.done) : [];
  const add = (name: string) => { onAdd(name); setQuery(''); };
  return (
    <Sheet title={`Adicionar em ${dayName}`} open={open} onClose={onClose}>
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ou digitar o nome" aria-label="Nome do exercício"
        aria-controls={listId} className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      <ul id={listId} className="mt-2">
        {matches.map(name => <li key={name}><SheetAction onClick={() => add(name)}><ExerciseThumb name={name} />{name}</SheetAction></li>)}
      </ul>
      {q && !matches.some(n => n.toLowerCase() === q) && (
        <button type="button" onClick={() => add(query)} className="mt-2 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
          Adicionar “{query.trim()}”
        </button>
      )}
    </Sheet>
  );
}

/** Faixa de reps (M10). Mínimo igual ao máximo = repetições fixas; `reps` fica sendo o topo. */
function rangePatch(min: number, max: number): Partial<PlanExercise> {
  // sem forçar máx ≥ mín aqui: o campo repassa a cada tecla ("12" passa por "1"); repRange corrige
  const repMin = Math.max(1, Math.round(min));
  const repMax = Math.max(1, Math.round(max));
  return { reps: Math.max(repMin, repMax), repMin, repMax };
}
