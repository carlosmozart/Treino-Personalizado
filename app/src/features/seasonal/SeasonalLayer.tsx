import { lazy, Suspense } from 'react';
import { activeSeason, adventDay, seasonInWorkout } from '../../domain/seasonal';
import { useToday } from '../../hooks/use-today';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { useWorkoutUi } from '../workout/workout-ui';

// ficam fora do pacote principal: cada tema só baixa na sua época
const Halloween = lazy(() => import('./Halloween'));
const Natal = lazy(() => import('./Natal'));
const AdventCalendar = lazy(() => import('./AdventCalendar'));

/** Decorações do tema de época, por cima das telas (Perfil → Aparência → Temas de época). */
export function SeasonalLayer() {
  const settings = useAppStore(s => s.data?.settings);
  const training = useAppStore(s => !!s.session);
  const summary = useWorkoutUi(s => s.summaryId);
  const tab = useUiStore(s => s.tab);
  const today = useToday(s => s.today);
  const season = settings ? activeSeason(settings, today) : null;
  if (!settings || !season) return null;
  const workoutTab = tab === 'treino' && (training || !!summary);
  if (workoutTab && !seasonInWorkout(settings, today)) return null;
  const mode = !workoutTab ? 'full' : summary ? 'summary' : 'workout';
  return (
    <Suspense fallback={null}>
      {season === 'natal' ? <Natal mode={mode} tab={tab} today={today} /> : <Halloween mode={mode} tab={tab} today={today} />}
    </Suspense>
  );
}

/** V5: o calendário do advento, um cartão no Início de 1º a 24 de dezembro com o tema de Natal. */
export function AdventSlot() {
  const settings = useAppStore(s => s.data?.settings);
  const today = useToday(s => s.today);
  if (!settings || activeSeason(settings, today) !== 'natal' || adventDay(today) === null) return null;
  return (
    <Suspense fallback={null}>
      <AdventCalendar today={today} />
    </Suspense>
  );
}
