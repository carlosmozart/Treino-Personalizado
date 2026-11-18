// Adicionar exercícios a um dia do plano, vários de uma vez (pelo grupo ou pela busca). Saiu de PlanScreen.tsx (X13).
import { useId, useState } from 'react';
import { MAX_EXERCISES_PER_DAY } from '../../domain/model';
import { MUSCLE_GROUPS, libraryEntries } from '../../data/exercise-library';
import { normalizeExerciseName } from '../../domain/text';
import { useAppStore } from '../../store';
import { ExerciseThumb } from '../../ui/ExerciseIllustration';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { searchNames } from '../../domain/search';
import { useSearchPool } from '../../hooks/use-search-pool';
import { plural } from '../../ui/format';

/**
 * Adicionar exercícios a um treino: buscar pelo nome ou escolher pelo grupo muscular. O painel fica
 * aberto para pôr vários de uma vez; os que já estão no treino aparecem marcados.
 */
export function AddExerciseSheet({ open, dayName, existing, full, onClose, onAdd }: {
  open: boolean; dayName: string; existing: readonly string[]; full: boolean; onClose: () => void; onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const custom = useAppStore(s => s.data?.settings.customExercises);
  const listId = useId();
  const q = query.trim().toLowerCase();
  const pool = useSearchPool();
  const matches = q ? searchNames(q, pool.names, 8, pool.done, pool.favorites, pool.aliases) : [];
  const inGroup = !q && group ? libraryEntries(custom ?? []).filter(e => e.group === group).map(e => e.name) : [];
  const have = new Set(existing.map(normalizeExerciseName));
  const close = () => { setQuery(''); setGroup(null); setAdded([]); onClose(); };
  const add = (name: string) => {
    if (full) return;
    onAdd(name.trim());
    setAdded(a => [...a, name.trim()]);
    setQuery('');
  };
  const row = (name: string) => {
    const there = have.has(normalizeExerciseName(name));
    return (
      <li key={name}>
        <SheetAction onClick={() => add(name)}>
          <ExerciseThumb name={name} />
          <span className="min-w-0 flex-1">{name}{there && <span className="block text-xs font-normal text-success">✓ já está no treino</span>}</span>
        </SheetAction>
      </li>
    );
  };
  return (
    <Sheet title={`Adicionar em ${dayName}`} open={open} onClose={close}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ou digitar o nome" aria-label="Nome do exercício"
        aria-controls={listId} className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      {!q && (
        <>
          <p className="mt-3 text-sm font-semibold text-muted">Ou escolha pelo grupo</p>
          <div role="radiogroup" aria-label="Grupo muscular" className="mt-1 flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map(g => (
              <button key={g} type="button" role="radio" aria-checked={group === g} onClick={() => setGroup(group === g ? null : g)}
                className={`h-9 rounded-full border px-3 text-sm font-semibold ${group === g ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted'}`}>{g}</button>
            ))}
          </div>
        </>
      )}
      <ul id={listId} className="mt-2">{(q ? matches : inGroup).map(row)}</ul>
      {q && !matches.some(n => n.toLowerCase() === q) && (
        <button type="button" onClick={() => add(query)} disabled={full} className="mt-2 h-12 w-full rounded-xl bg-surface-2 text-base font-bold disabled:opacity-50">
          Adicionar “{query.trim()}”
        </button>
      )}
      {(added.length > 0 || full) && (
        <div className="sticky bottom-0 mt-3 space-y-2 bg-surface pb-1 pt-2">
          <p role="status" className="text-sm text-muted">
            {full ? `Limite de ${MAX_EXERCISES_PER_DAY} exercícios neste treino.` : `${added[added.length - 1]} adicionado. ${plural(existing.length, 'exercício', 'exercícios')} no treino.`}
          </p>
          <button type="button" onClick={close} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
            Pronto{added.length > 1 ? ` (${added.length} adicionados)` : ''}
          </button>
        </div>
      )}
    </Sheet>
  );
}
