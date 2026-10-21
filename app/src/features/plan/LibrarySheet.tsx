import { useEffect, useMemo, useRef, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS, filterLibrary, groupOf, libraryEntries, type Equipment, type LibraryEntry } from '../../data/exercise-library';
import { addCustomExercise, removeCustomExercise, toggleFavorite } from '../../domain/actions';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { DAY_FULL_NAMES, MAX_EXERCISES_PER_DAY, type Plan } from '../../domain/model';
import { addExercise, editPlan, newPlanExercise } from '../../domain/plan-edit';
import { rotationLetter, rotationOrder, rotationTitle } from '../../domain/rotation';
import { normalizeExerciseName } from '../../domain/text';
import { useSearchPool } from '../../hooks/use-search-pool';
import { useAppStore } from '../../store';
import { ExerciseIllustration, ExerciseThumb } from '../../ui/ExerciseIllustration';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { dayTitle } from '../../ui/format';

const CHIP = 'h-9 shrink-0 rounded-full border px-3 text-sm font-semibold';
const chip = (on: boolean) => `${CHIP} ${on ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted'}`;
const INPUT = 'h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';

/** Miniatura só quando a linha aparece na tela: a lista inteira teria 150 ilustrações carregando juntas. */
function LazyThumb({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return seen ? <ExerciseThumb name={name} /> : <span ref={ref} aria-hidden="true" className="size-10 shrink-0 rounded-lg bg-surface-2" />;
}

/** Os dias do plano onde dá para adicionar: na rotação, os treinos A/B/C; senão, a semana. */
function planSlots(plan: Plan): { key: DayKey; label: string }[] {
  if (plan.rotation) return rotationOrder(plan).map(k => {
    const letter = `Treino ${rotationLetter(plan, k)}`, title = rotationTitle(plan, k);
    return { key: k, label: title === letter ? letter : `${letter} · ${title}` };
  });
  return DAY_KEYS.map(k => {
    const day = plan.days[k];
    return { key: k, label: day.exercises.length ? `${DAY_FULL_NAMES[k]} · ${dayTitle(day, k).title.replace(new RegExp(`^${DAY_FULL_NAMES[k]}:\\s*`, 'i'), '')}` : `${DAY_FULL_NAMES[k]} · Descanso` };
  });
}

/**
 * M46: Biblioteca de exercícios: busca tolerante, filtros por grupo e equipamento, ilustração,
 * favoritar, adicionar a um dia do plano e criar exercício próprio.
 */
export function LibrarySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const pool = useSearchPool();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [picked, setPicked] = useState<LibraryEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const custom = data?.settings.customExercises;
  const entries = useMemo(() => libraryEntries(custom ?? []), [custom]);
  const list = useMemo(() => filterLibrary(entries, { query, group, equipment, mine }, pool.done, pool.favorites), [entries, query, group, equipment, mine, pool]);
  if (!data) return null;
  const plan = data.activePlanId ? data.plans[data.activePlanId] : undefined;

  const close = () => { setPicked(null); setCreating(false); setMessage(''); onClose(); };
  const addTo = (entry: LibraryEntry, slot: { key: DayKey; label: string }) => {
    if (!plan) return;
    if (plan.days[slot.key].exercises.length >= MAX_EXERCISES_PER_DAY) { setMessage(`${slot.label} já tem ${MAX_EXERCISES_PER_DAY} exercícios.`); return; }
    run((d, now) => editPlan(d, plan.id, p => addExercise(p, slot.key, newPlanExercise(entry.name)), now));
    setMessage(`${entry.name} adicionado em ${slot.label.split(' · ')[0]}.`);
    setPicked(null);
  };

  return (
    <>
      <Sheet title="Biblioteca de exercícios" open={open && !picked && !creating} onClose={close}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar exercício" aria-label="Buscar na biblioteca" className={INPUT} />
        <div role="group" aria-label="Grupo muscular" className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <button type="button" aria-pressed={!group && !mine} onClick={() => { setGroup(null); setMine(false); }} className={chip(!group && !mine)}>Todos</button>
          {MUSCLE_GROUPS.map(g => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => { setGroup(group === g ? null : g); setMine(false); }} className={chip(group === g)}>{g}</button>
          ))}
          {!!custom?.length && <button type="button" aria-pressed={mine} onClick={() => { setMine(!mine); setGroup(null); }} className={chip(mine)}>Meus</button>}
        </div>
        <div role="group" aria-label="Equipamento" className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {EQUIPMENT.filter(e => e !== 'Outros' || entries.some(x => x.equipment === 'Outros')).map(e => (
            <button key={e} type="button" aria-pressed={equipment === e} onClick={() => setEquipment(equipment === e ? null : e)} className={chip(equipment === e)}>{e}</button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted" aria-live="polite">{list.length === 1 ? '1 exercício' : `${list.length} exercícios`}</p>
        {message && <p role="status" className="text-sm text-success">{message}</p>}
        <ul className="mt-1">
          {list.map(e => {
            const fav = pool.favorites.has(normalizeExerciseName(e.name));
            return (
              <li key={e.name}>
                <button type="button" onClick={() => { setPicked(e); setMessage(''); }} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left active:bg-surface-2">
                  <LazyThumb name={e.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{e.name}{fav ? ' ★' : ''}</span>
                    <span className="block text-sm text-muted">{e.group} · {e.equipment}{e.custom ? ' · seu' : ''}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!list.length && <p className="py-4 text-center text-muted">Nenhum exercício com esses filtros.</p>}
        <button type="button" onClick={() => setCreating(true)} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 font-semibold">
          <Icon name="mais" /> Criar exercício
        </button>
      </Sheet>

      {picked && (
        <Sheet title={picked.name} open={open} onClose={() => setPicked(null)}>
          <div className="flex items-center gap-3">
            <ExerciseIllustration name={picked.name} size="large" />
            <p className="text-muted">{picked.group} · {picked.equipment}{picked.custom ? ' · criado por você' : ''}</p>
          </div>
          <SheetAction onClick={() => run((d, now) => toggleFavorite(d, picked.name, now))}>
            <Icon name="trofeu" />{pool.favorites.has(normalizeExerciseName(picked.name)) ? 'Tirar dos favoritos' : 'Favoritar'}
          </SheetAction>
          {picked.custom && (
            <SheetAction tone="danger" onClick={() => {
              if (!confirm(`Apagar “${picked.name}” da biblioteca? Os treinos e planos que já usam o nome continuam iguais.`)) return;
              run((d, now) => removeCustomExercise(d, picked.name, now));
              setPicked(null);
            }}><Icon name="lixo" />Apagar da biblioteca</SheetAction>
          )}
          <h3 className="mt-3 px-3 text-sm font-semibold text-muted">{plan ? `Adicionar em “${plan.name}”` : 'Crie um plano para adicionar exercícios'}</h3>
          {plan && planSlots(plan).map(slot => (
            <SheetAction key={slot.key} onClick={() => addTo(picked, slot)}><Icon name="mais" />{slot.label}</SheetAction>
          ))}
          {message && <p role="status" className="px-3 text-sm text-warning">{message}</p>}
        </Sheet>
      )}

      {creating && <CreateExercise open={open} onClose={() => setCreating(false)} onCreated={name => { setCreating(false); setMine(false); setGroup(null); setEquipment(null); setQuery(name); setMessage(`${name} criado.`); }} />}
    </>
  );
}

function CreateExercise({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const run = useAppStore(s => s.run);
  const custom = useAppStore(s => s.data?.settings.customExercises);
  const [name, setName] = useState('');
  const [group, setGroup] = useState(MUSCLE_GROUPS[0]!);
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const exists = !!trimmed && groupOf(trimmed, custom) !== null;
  const save = () => {
    if (!trimmed || exists) return;
    run((d, now) => addCustomExercise(d, { name: trimmed, group }, now, MUSCLE_GROUPS, n => groupOf(n, d.settings.customExercises) !== null));
    onCreated(trimmed);
  };
  return (
    <Sheet title="Criar exercício" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="block text-sm font-semibold text-muted">Nome
          <input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Ex.: Remada no cabo unilateral" className={`${INPUT} mt-1`} />
        </label>
        {exists && <p className="text-sm text-warning">Esse exercício já está na biblioteca.</p>}
        <label className="block text-sm font-semibold text-muted">Grupo muscular
          <select value={group} onChange={e => setGroup(e.target.value)} className={`${INPUT} mt-1`}>
            {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <p className="text-xs text-faint">O exercício entra nas buscas, na troca e nas séries por grupo do Progresso. Ainda sem ilustração.</p>
        <button type="submit" disabled={!trimmed || exists} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-50">Criar</button>
      </form>
    </Sheet>
  );
}
