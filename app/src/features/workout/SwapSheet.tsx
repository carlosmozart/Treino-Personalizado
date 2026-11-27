import { useState } from 'react';
import { SWAP_EQUIPMENT, fitsEquipment, groupOf, guessGroup, swapSuggestions } from '../../data/exercise-library';
import { updateSettings } from '../../domain/actions';
import { searchNames } from '../../domain/search';
import { swapExercise, type ActiveSession } from '../../domain/session';
import { useSearchPool } from '../../hooks/use-search-pool';
import { useAppStore } from '../../store';
import { ExerciseThumb } from '../../ui/ExerciseIllustration';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';

/**
 * Trocar o exercício só neste treino: as reservas do plano, o que faz sentido no treino de hoje
 * (S3), a busca tolerante (S6) e o filtro pelo equipamento que a pessoa tem (M36).
 * Saiu do ExerciseCard em 16/11/2026 (X13), sem mudar o comportamento.
 */
export function SwapSheet({ session, index, open, onClose, onSwapped }: {
  session: ActiveSession; index: number; open: boolean; onClose: () => void;
  /** Depois de trocar (o card pergunta se a troca vale para o plano também). */
  onSwapped?: (name: string) => void;
}) {
  const update = useAppStore(s => s.updateSession);
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const pool = useSearchPool();
  const [query, setQuery] = useState('');
  const ex = session.exercises[index];
  if (!ex) return null;
  const available = data?.settings.availableEquipment ?? [];
  return (
    <Sheet title="Trocar por" open={open} onClose={onClose}>
      {[...(ex.swappedFrom ? [{ name: ex.swappedFrom, mode: 'reps' as const }] : []), ...ex.alternatives]
        .filter(a => a.name !== ex.name)
        .map(a => (
          <SheetAction key={a.name} onClick={() => { if (data) update(s => swapExercise(s, data, index, a.name)); onClose(); onSwapped?.(a.name); }}>
            <ExerciseThumb name={a.name} />{a.name}{a.name === ex.swappedFrom ? ' (original)' : ''}
          </SheetAction>
        ))}
      {(ex.alternatives.length > 0 || ex.swappedFrom) && <p className="mt-3 px-3 text-xs font-semibold text-faint">Ou qualquer exercício:</p>}
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ou digitar o nome" aria-label="Buscar exercício para trocar"
        className="mt-2 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      {/* M36: só o que a academia (ou a casa) tem; fica salvo para as próximas trocas */}
      <div role="group" aria-label="Equipamento que você tem" className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {SWAP_EQUIPMENT.map(eq => {
          const on = available.includes(eq);
          return (
            <button key={eq} type="button" aria-pressed={on}
              onClick={() => run((d, now) => {
                // lê o que está gravado agora: dois toques rápidos não se sobrescrevem
                const cur = d.settings.availableEquipment ?? [];
                return updateSettings(d, { availableEquipment: cur.includes(eq) ? cur.filter(x => x !== eq) : [...cur, eq] }, now);
              })}
              className={`h-9 shrink-0 rounded-full border px-3 text-sm font-semibold ${on ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted'}`}>
              {eq}
            </button>
          );
        })}
      </div>
      <p className="px-1 text-xs text-faint">{available.length ? 'Mostrando só o que usa o equipamento marcado.' : 'Marque o que você tem aqui para ver só o que dá para fazer.'}</p>
      {(() => {
        const q = query.trim().toLowerCase();
        const fits = (n: string) => fitsEquipment(n, available, data?.settings.customExercises);
        const pick = (name: string) => { if (data) update(s => swapExercise(s, data, index, name)); onClose(); setQuery(''); onSwapped?.(name); };
        // S3: sem busca, o que faz sentido no treino de hoje: mesmo grupo, sem repetir exercício do
        // treino, o mesmo movimento primeiro
        const base = ex.swappedFrom ?? ex.name;
        if (!q) {
          const today = session.exercises.filter((_, i) => i !== index).map(e => e.name);
          const { group: g, names: same } = swapSuggestions(base, today, [ex.name, ...ex.alternatives.map(a => a.name)], 6, pool.favorites, fits);
          if (!same.length) return available.length ? <p className="mt-3 px-3 text-sm text-muted">Nada do mesmo grupo com esse equipamento. Busque pelo nome ou desmarque um filtro.</p> : null;
          return (
            <>
              <p className="mt-3 px-3 text-xs font-semibold text-faint">Para o treino de hoje ({g}), sem repetir exercício:</p>
              {same.map(n => <SheetAction key={n} onClick={() => pick(n)}><ExerciseThumb name={n} />{n}</SheetAction>)}
            </>
          );
        }
        const group = guessGroup(base);
        // S6: tolerante a erro, acento, plural e abreviação; o mesmo grupo sobe entre os achados
        const matches = searchNames(q, pool.names.filter(n => n !== ex.name && fits(n)), 12, pool.done, pool.favorites, pool.aliases)
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
      <p className="mt-2 px-3 text-sm text-faint">Depois de trocar, você escolhe se vale só para hoje ou para o plano também.</p>
    </Sheet>
  );
}
