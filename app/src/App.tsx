import { TabBar, TAB_LABELS } from './ui/TabBar';
import { useUiStore } from './store/ui-store';
import { useAppStore } from './store';

export function App() {
  const tab = useUiStore(s => s.tab);
  const status = useAppStore(s => s.status);
  const error = useAppStore(s => s.error);
  const workoutCount = useAppStore(s => s.data?.workouts.length ?? 0);

  return (
    <div className="safe-top min-h-dvh pb-28">
      <main className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="text-3xl font-black tracking-tight">{TAB_LABELS[tab]}</h1>
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
        <p className="mt-6 text-center text-sm text-faint">Treino Personalizado v{__APP_VERSION__}</p>
      </main>
      <TabBar />
    </div>
  );
}
