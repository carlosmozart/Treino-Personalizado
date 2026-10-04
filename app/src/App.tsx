import { TabBar, TAB_LABELS } from './ui/TabBar';
import { Toaster } from './ui/Toaster';
import { useUiStore } from './store/ui-store';
import { useAppStore } from './store';
import { WorkoutScreen } from './features/workout/WorkoutScreen';
import { RestBar } from './features/workout/RestBar';
import { HomeScreen } from './features/home/HomeScreen';
import { PlanScreen } from './features/plan/PlanScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';

const SCREENS = { inicio: () => <HomeScreen />, plano: () => <PlanScreen />, treino: () => <WorkoutScreen />, progresso: () => <ProgressScreen />, perfil: () => <ProfileScreen /> };

export function App() {
  const tab = useUiStore(s => s.tab);
  const status = useAppStore(s => s.status);
  const error = useAppStore(s => s.error);
  const workoutCount = useAppStore(s => s.data?.workouts.length ?? 0);

  return (
    <div className="safe-top min-h-dvh pb-44">
      <main className="mx-auto max-w-xl px-4">
        {status === 'ready' && tab in SCREENS ? SCREENS[tab as keyof typeof SCREENS]() : (
          <>
            <h1 className="pt-6 text-3xl font-black tracking-tight">{TAB_LABELS[tab]}</h1>
            <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
              <p className="text-base text-muted">
                Nova versão em construção. O app atual continua sendo o oficial até a troca.
              </p>
              <p className="mt-2 text-sm text-faint" role="status">
                {status === 'loading' ? 'Carregando seus dados…'
                  : status === 'error' ? `Não foi possível abrir seus dados: ${error ?? ''}`
                  : `${workoutCount} ${workoutCount === 1 ? 'treino' : 'treinos'} no histórico.`}
              </p>
            </section>
          </>
        )}
        <p className="mt-6 text-center text-sm text-faint">Treino Personalizado v{__APP_VERSION__}</p>
      </main>
      <RestBar />
      <Toaster />
      <TabBar />
    </div>
  );
}
