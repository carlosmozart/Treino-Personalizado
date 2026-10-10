import { useState } from 'react';
import { swapSuggestions } from '../../data/exercise-library';
import { addExerciseToSession, type ActiveSession } from '../../domain/session';
import { searchNames } from '../../domain/search';
import { useSearchPool } from '../../hooks/use-search-pool';
import { useAppStore } from '../../store';
import { ExerciseThumb } from '../../ui/ExerciseIllustration';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';

/** M18: adicionar um exercício ao treino em andamento; sugere o grupo que mais aparece no treino. */
export function AddToWorkoutSheet({ open, session, onClose, onAdded }: { open: boolean; session: ActiveSession; onClose: () => void; onAdded: () => void }) {
  const data = useAppStore(s => s.data);
  const update = useAppStore(s => s.updateSession);
  const [query, setQuery] = useState('');
  const today = session.exercises.map(e => e.name);
  const add = (name: string) => {
    if (!data) return;
    update(s => addExerciseToSession(s, data, name));
    setQuery('');
    onClose();
    onAdded();
  };
  const q = query.trim();
  const pool = useSearchPool();
  const suggestions = q ? searchNames(q, pool.names.filter(n => !today.includes(n)), 6, pool.done, pool.favorites) : swapSuggestions('', today, [], 6, pool.favorites).names;
  const group = q ? null : swapSuggestions('', today).group;
  return (
    <Sheet title="Adicionar exercício" open={open} onClose={() => { setQuery(''); onClose(); }}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ou digitar o nome" aria-label="Buscar exercício para adicionar"
        className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      {!q && group && <p className="mt-3 px-3 text-xs font-semibold text-faint">Combina com o treino de hoje ({group}):</p>}
      {suggestions.map(n => <SheetAction key={n} onClick={() => add(n)}><ExerciseThumb name={n} />{n}</SheetAction>)}
      {q && !suggestions.some(n => n.toLowerCase() === q.toLowerCase()) && (
        <SheetAction onClick={() => add(q)}><Icon name="mais" />Usar “{q}”</SheetAction>
      )}
      <p className="mt-2 px-3 text-sm text-faint">Vale só para este treino; o plano continua igual.</p>
    </Sheet>
  );
}
