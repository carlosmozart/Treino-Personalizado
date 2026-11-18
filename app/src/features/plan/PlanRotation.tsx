// Plano em rotação A/B/C (R1, T14): os cartões, a meta por semana e a ordem da volta. Saiu de PlanScreen.tsx (X13).
import { DAY_KEYS } from '../../domain/ai-plan';
import { toDateKey } from '../../domain/dates';
import { type Plan } from '../../domain/model';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { addSlot, canRemoveSlot, LETTERS, MAX_ROTATION_SLOTS, moveSlot, removeSlot, restartRotation, REST_SLOT, rotationLetter, rotationOrder, rotationSlots as rotationSlotsOf, rotationState, rotationTitle, setRotationPerWeek } from '../../domain/rotation';

export type Edit = (fn: (p: Plan) => Plan) => void;

/** Treinos da rotação pela letra e, no fim, um vazio para criar o próximo treino (máximo 7). */
export function rotationCards(plan: Plan) {
  const order = rotationOrder(plan);
  const empty = DAY_KEYS.find(k => !order.includes(k));
  return [
    ...order.map(key => ({ key, letter: rotationLetter(plan, key) })),
    // o espaço vazio já leva a letra que vai ganhar (o próximo da volta)
    ...(empty ? [{ key: empty, letter: '', next: LETTERS[order.length] ?? '' }] : [])
  ];
}

/** Rotação (R1): meta por semana, onde está a volta e recomeçar do A. */
export function RotationPanel({ plan, edit }: { plan: Plan; edit: Edit }) {
  const workouts = useAppStore(s => s.data?.workouts);
  const rot = rotationState(plan, workouts ?? [], toDateKey(new Date()));
  if (!plan.rotation) return null;
  return (
    <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">
        O próximo treino é o seguinte ao último feito, em qualquer dia da semana.
        {rot ? ` Próximo: treino ${rotationLetter(plan, rot.next)} (${rot.done} de ${rot.total} da volta).` : ' Adicione exercícios a um treino para começar.'}
      </p>
      {rot && <RotationOrder plan={plan} edit={edit} nextIndex={rot.nextIndex} />}
      <div className="mt-3 flex items-end gap-3">
        <label className="w-32 text-xs font-semibold text-muted">Treinos por semana
          <NumberField label="Meta de treinos por semana" value={plan.rotation.perWeek} onChange={n => { if (n >= 1 && n <= 7) edit(p => setRotationPerWeek(p, n)); }} className="mt-1" />
        </label>
        <button type="button" disabled={!rot || rot.done === 0} onClick={() => { if (confirm('Recomeçar a rotação pelo treino A?')) edit(p => restartRotation(p, new Date())); }}
          className="h-11 rounded-xl bg-surface-2 px-4 font-semibold disabled:opacity-40">
          Recomeçar do A
        </button>
      </div>
      <p className="mt-2 text-xs text-faint">A meta vale para a semana, o XP e a sequência. Com os lembretes ligados (Perfil → Treino), o aviso diz qual é o próximo treino e para quando a meta da semana é cumprida.</p>
    </section>
  );
}

/**
 * T14: a volta em ordem, com dias de descanso e treinos repetidos (A, B, descanso, C, B…). Um
 * treino só sai da volta se aparecer outra vez; para tirar de vez, esvazie o treino.
 */
export function RotationOrder({ plan, edit, nextIndex }: { plan: Plan; edit: Edit; nextIndex: number }) {
  const slots = rotationSlotsOf(plan);
  const full = slots.length >= MAX_ROTATION_SLOTS;
  const label = (s: (typeof slots)[number]) => (s === REST_SLOT ? 'Descanso' : `${rotationLetter(plan, s)} · ${rotationTitle(plan, s)}`);
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-muted">Ordem da volta</p>
      <ol aria-label="Ordem da volta" className="mt-1 space-y-1">
        {slots.map((s, i) => {
          const place = `${i + 1}º da volta`;
          return (
            <li key={`${i}-${s}`} className="flex items-center rounded-xl bg-surface-2 pl-3">
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${s === REST_SLOT ? 'text-muted' : ''}`}>
                {i + 1}. {label(s)}{i === nextIndex ? <span className="text-primary"> · próximo</span> : null}
              </span>
              <button type="button" disabled={i === 0} onClick={() => edit(p => moveSlot(p, i, -1))} aria-label={`Subir o ${place}`}
                className="flex size-11 shrink-0 items-center justify-center text-muted disabled:opacity-30"><Icon name="subir" /></button>
              <button type="button" disabled={i === slots.length - 1} onClick={() => edit(p => moveSlot(p, i, 1))} aria-label={`Descer o ${place}`}
                className="flex size-11 shrink-0 items-center justify-center text-muted disabled:opacity-30"><Icon name="descer" /></button>
              <button type="button" disabled={!canRemoveSlot(plan, i)} onClick={() => edit(p => removeSlot(p, i))} aria-label={`Tirar o ${place}`}
                className="flex size-11 shrink-0 items-center justify-center text-muted disabled:opacity-30"><Icon name="fechar" /></button>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={full} onClick={() => edit(p => addSlot(p, REST_SLOT))}
          className="h-11 rounded-xl bg-surface-2 px-3 text-sm font-semibold disabled:opacity-40">+ Descanso</button>
        {rotationOrder(plan).map(k => (
          <button key={k} type="button" disabled={full} onClick={() => edit(p => addSlot(p, k))} aria-label={`Repetir o treino ${rotationLetter(plan, k)} na volta`}
            className="h-11 rounded-xl bg-surface-2 px-3 text-sm font-semibold disabled:opacity-40">+ {rotationLetter(plan, k)}</button>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">O descanso vale pelos dias seguintes ao treino anterior; treinar nele não atrapalha, o app só passa para o próximo. Para tirar um treino de vez, esvazie-o abaixo.</p>
    </div>
  );
}
