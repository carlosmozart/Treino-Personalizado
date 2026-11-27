import { useState } from 'react';
import { fitsEquipment, groupOf, guessGroup, swapSuggestions } from '../../data/exercise-library';
import type { PlanExercise } from '../../domain/model';
import { searchNames } from '../../domain/search';
import { useSearchPool } from '../../hooks/use-search-pool';
import { useAppStore } from '../../store';
import { ExerciseThumb } from '../../ui/ExerciseIllustration';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';

/**
 * Trocar um exercício do plano por outro: as reservas, o mesmo grupo muscular sem repetir o que
 * já está no dia, ou a busca. Ficam as séries, as repetições e o descanso (replacePlanExercise).
 */
export function PlanSwapSheet({ ex, dayNames, open, onClose, onPick }: {
  ex: PlanExercise | null; dayNames: readonly string[]; open: boolean; onClose: () => void; onPick: (name: string) => void;
}) {
  const pool = useSearchPool();
  const available = useAppStore(s => s.data?.settings.availableEquipment) ?? [];
  const custom = useAppStore(s => s.data?.settings.customExercises);
  const [query, setQuery] = useState('');
  if (!ex) return null;
  const close = () => { setQuery(''); onClose(); };
  const pick = (name: string) => { onPick(name); close(); };
  const fits = (n: string) => fitsEquipment(n, available, custom);
  const q = query.trim().toLowerCase();
  const reserves = ex.alternatives.filter(a => a.name !== ex.name);

  return (
    <Sheet title={`Trocar ${ex.name}`} open={open} onClose={close}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ou digitar o nome" aria-label="Buscar exercício para trocar no plano"
        className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      {!q && reserves.length > 0 && (
        <>
          <p className="mt-3 px-3 text-xs font-semibold text-faint">Reservas deste exercício:</p>
          {reserves.map(a => <SheetAction key={a.name} onClick={() => pick(a.name)}><ExerciseThumb name={a.name} />{a.name}</SheetAction>)}
        </>
      )}
      {(() => {
        if (!q) {
          const { group, names } = swapSuggestions(ex.name, dayNames.filter(n => n !== ex.name), [ex.name, ...reserves.map(a => a.name)], 8, pool.favorites, fits);
          if (!names.length) return null;
          return (
            <>
              <p className="mt-3 px-3 text-xs font-semibold text-faint">Do mesmo grupo{group ? ` (${group})` : ''}, sem repetir o que já está no dia:</p>
              {names.map(n => <SheetAction key={n} onClick={() => pick(n)}><ExerciseThumb name={n} />{n}</SheetAction>)}
            </>
          );
        }
        const group = guessGroup(ex.name);
        const matches = searchNames(q, pool.names.filter(n => n !== ex.name && fits(n)), 12, pool.done, pool.favorites, pool.aliases)
          .map((n, i) => ({ n, i: i - (groupOf(n) === group ? 0.5 : 0) }))
          .sort((a, b) => a.i - b.i).slice(0, 8).map(x => x.n);
        return (
          <>
            {matches.map(n => <SheetAction key={n} onClick={() => pick(n)}><ExerciseThumb name={n} />{n}</SheetAction>)}
            {!matches.some(n => n.toLowerCase() === q) && (
              <SheetAction onClick={() => pick(query)}><Icon name="mais" />Usar “{query.trim()}”</SheetAction>
            )}
          </>
        );
      })()}
      <p className="mt-2 px-3 pb-2 text-sm text-faint">Ficam as séries, as repetições e o descanso. {ex.name} vira reserva, para voltar a ele no treino se quiser.</p>
    </Sheet>
  );
}
