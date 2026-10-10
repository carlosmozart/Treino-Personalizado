import { useMemo } from 'react';
import { EXERCISE_LIBRARY } from '../data/exercise-library';
import { searchPool } from '../domain/search';
import { useAppStore } from '../store';

const LIBRARY = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

/** Biblioteca + nomes do histórico, e o que já foi feito (a busca dá prioridade a isso). */
export function useSearchPool() {
  const workouts = useAppStore(s => s.data?.workouts);
  return useMemo(() => searchPool(LIBRARY, workouts ?? []), [workouts]);
}
