import { useAppStore } from '../../store';
import { ActiveWorkout } from './ActiveWorkout';
import { DayPicker } from './DayPicker';
import { WorkoutSummary } from './WorkoutSummary';
import { useWorkoutUi } from './workout-ui';
import { ScreenTitle } from '../help/HelpButton';

export function WorkoutScreen() {
  const session = useAppStore(s => s.session);
  const summaryId = useWorkoutUi(s => s.summaryId);
  if (session) return <ActiveWorkout session={session} />;
  if (summaryId) return <WorkoutSummary id={summaryId} />;
  return (
    <>
      <ScreenTitle>Treino</ScreenTitle>
      <DayPicker />
    </>
  );
}
