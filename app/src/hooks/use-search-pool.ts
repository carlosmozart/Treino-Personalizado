import { useMemo } from 'react';
import { EXERCISE_LIBRARY } from '../data/exercise-library';
import { searchPool } from '../domain/search';
import { useAppStore } from '../store';

const LIBRARY = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

/** Biblioteca + nomes do histórico, o que já foi feito e os favoritos (a busca dá prioridade a eles). */
export function useSearchPool() {
  const workouts = useAppStore(s => s.data?.workouts);
  const favs = useAppStore(s => s.data?.settings.favorites);
  return useMemo(() => ({ ...searchPool(LIBRARY, workouts ?? []), favorites: new Set(favs ?? []) }), [workouts, favs]);
}
