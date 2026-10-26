import { lazy, Suspense } from 'react';
import { halloweenInWorkout, halloweenOn } from '../../domain/seasonal';
import { useToday } from '../../hooks/use-today';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { useWorkoutUi } from '../workout/workout-ui';

// fica fora do pacote principal: só baixa quando o tema de época está valendo
const Halloween = lazy(() => import('./Halloween'));

/** Decorações do tema de época, por cima das telas (Perfil → Aparência → Temas de época). */
export function SeasonalLayer() {
  const settings = useAppStore(s => s.data?.settings);
  const training = useAppStore(s => !!s.session);
  const summary = useWorkoutUi(s => s.summaryId);
  const tab = useUiStore(s => s.tab);
  const today = useToday(s => s.today);
  if (!settings || !halloweenOn(settings, today)) return null;
  const workoutTab = tab === 'treino' && (training || !!summary);
  if (workoutTab && !halloweenInWorkout(settings, today)) return null;
  const mode = !workoutTab ? 'full' : summary ? 'summary' : 'workout';
  return (
    <Suspense fallback={null}>
      <Halloween mode={mode} tab={tab} today={today} />
    </Suspense>
  );
}
