import { lazy, Suspense } from 'react';
import { TabBar, TAB_LABELS } from './ui/TabBar';
import { Toaster } from './ui/Toaster';
import { ErrorNotice } from './ui/ErrorNotice';
import { UpdateBanner, UpdateOffer } from './features/profile/UpdateOffer';
import { WhatsNew } from './features/profile/WhatsNew';
import { useUiStore } from './store/ui-store';
import { useToday } from './hooks/use-today';
import { useAppStore } from './store';
import { WorkoutScreen } from './features/workout/WorkoutScreen';
import { ForgottenWatcher } from './features/workout/WorkoutExtras';
import { RestBar } from './features/workout/RestBar';
import { HomeScreen } from './features/home/HomeScreen';
import { SeasonalLayer } from './features/seasonal/SeasonalLayer';
import { HelpSheet } from './features/help/HelpSheet';
import { Tour } from './features/help/Tour';

// X14: Início e Treino vêm no pacote principal (abrem na hora); Plano, Progresso e Perfil, e a
// animação do modo RPG (só com ele ligado), baixam quando usados
const PlanScreen = lazy(() => import('./features/plan/PlanScreen').then(m => ({ default: m.PlanScreen })));
const ProgressScreen = lazy(() => import('./features/progress/ProgressScreen').then(m => ({ default: m.ProgressScreen })));
const ProfileScreen = lazy(() => import('./features/profile/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const RpgLevelUp = lazy(() => import('./features/rpg/LevelUp').then(m => ({ default: m.RpgLevelUp })));

const SCREENS = { inicio: () => <HomeScreen />, plano: () => <PlanScreen />, treino: () => <WorkoutScreen />, progresso: () => <ProgressScreen />, perfil: () => <ProfileScreen /> };

export function App() {
  const tab = useUiStore(s => s.tab);
  // redesenha tudo na virada do dia (as telas calculam "hoje" ao desenhar)
  const today = useToday(s => s.today);
  const status = useAppStore(s => s.status);
  const error = useAppStore(s => s.error);
  const workoutCount = useAppStore(s => s.data?.workouts.length ?? 0);
  const rpgOn = useAppStore(s => !!s.data?.rpg?.enabled);

  return (
    <div className="safe-top relative min-h-dvh pb-44">
      <main data-today={today} className="mx-auto max-w-xl px-4">
        {status === 'ready' && tab in SCREENS ? <Suspense fallback={<div className="pt-6" aria-busy="true" />}>{SCREENS[tab as keyof typeof SCREENS]()}</Suspense> : (
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
      {status === 'ready' && <SeasonalLayer />}
      {status === 'ready' && rpgOn && <Suspense fallback={null}><RpgLevelUp /></Suspense>}
      <RestBar />
      {status === 'ready' && <ForgottenWatcher />}
      <Toaster />
      <ErrorNotice />
      <UpdateOffer />
      <UpdateBanner />
      <WhatsNew />
      <TabBar />
      {status === 'ready' && <HelpSheet />}
      {status === 'ready' && <Tour />}
    </div>
  );
}
