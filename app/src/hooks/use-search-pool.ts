import { useMemo } from 'react';
import { EXERCISE_LIBRARY } from '../data/exercise-library';
import { searchPool } from '../domain/search';
import { useAppStore } from '../store';

const LIBRARY = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

/** Biblioteca + exercícios próprios (M46) + nomes do histórico, o que já foi feito e os favoritos (a busca dá prioridade a eles). */
export function useSearchPool() {
  const workouts = useAppStore(s => s.data?.workouts);
  const favs = useAppStore(s => s.data?.settings.favorites);
  const custom = useAppStore(s => s.data?.settings.customExercises);
  return useMemo(() => {
    const names = custom?.length ? [...LIBRARY, ...custom.map(c => c.name)] : LIBRARY;
    return { ...searchPool(names, workouts ?? []), favorites: new Set(favs ?? []) };
  }, [workouts, favs, custom]);
}
