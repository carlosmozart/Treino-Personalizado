// Estado central do app: os dados do usuário, o treino em andamento e os eventos de recompensa
// ainda não exibidos. As regras ficam em domain/; aqui só se aplica a ação e se agenda a gravação.
import { create } from 'zustand';
import * as actions from '../domain/actions';
import type { DayKey } from '../domain/ai-plan';
import type { AppData } from '../domain/model';
import type { MigrationReport } from '../domain/legacy/migrate';
import type { RewardEvent } from '../domain/rewards';
import { startSession, type ActiveSession } from '../domain/session';
import { createPersister, type Persister } from '../storage/persister';
import type { Repository } from '../storage/repository';
import type { StartupResult } from '../storage/startup';

export interface AppStoreDeps {
  load: () => Promise<StartupResult>;
  repo: Repository;
  now?: () => Date;
  makeId?: () => string;
  saveDelay?: number;
}

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** Última falha ao gravar; a interface avisa e sugere exportar o backup. */
  saveError: string | null;
  data: AppData | null;
  session: ActiveSession | null;
  startup: { kind: StartupResult['kind']; report?: MigrationReport } | null;
  /** Recompensas ainda não mostradas, em ordem. */
  events: RewardEvent[];

  init(): Promise<void>;
  /** Aplica uma ação pura do domínio aos dados. */
  run(action: (data: AppData, now: Date) => actions.ActionResult): void;
  startWorkout(planId: string, dayKey: DayKey): boolean;
  updateSession(change: (session: ActiveSession) => ActiveSession): void;
  discardWorkout(): void;
  finishWorkout(): 'saved' | 'empty' | 'no-session';
  takeEvents(): RewardEvent[];
  /** Grava o que estiver pendente (ao sair do app, antes de exportar). */
  flush(): Promise<void>;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function createAppStore(deps: AppStoreDeps) {
  const now = deps.now ?? (() => new Date());
  const makeId = deps.makeId ?? (() => crypto.randomUUID());
  let dataPersister: Persister<AppData>;
  let sessionPersister: Persister<ActiveSession | null>;
  let initializing: Promise<void> | null = null;

  const store = create<AppState>()((set, get) => {
    const onError = (error: unknown) => set({ saveError: message(error) });
    dataPersister = createPersister(value => deps.repo.saveData(value).then(() => { if (get().saveError) set({ saveError: null }); }), { delay: deps.saveDelay ?? 250, onError });
    sessionPersister = createPersister(value => deps.repo.saveSession(value), { delay: deps.saveDelay ?? 250, onError });

    function commit(data: AppData, events: RewardEvent[]) {
      set(state => ({ data, events: events.length ? [...state.events, ...events] : state.events }));
      dataPersister.schedule(data);
    }

    return {
      status: 'loading',
      error: null,
      saveError: null,
      data: null,
      session: null,
      startup: null,
      events: [],

      init() {
        initializing ??= (async () => {
          try {
            const result = await deps.load();
            const session = await deps.repo.loadSession();
            set({
              status: 'ready',
              data: result.data,
              session,
              startup: result.kind === 'migrated' ? { kind: result.kind, report: result.report } : { kind: result.kind }
            });
            get().run(actions.dailyCheck);
          } catch (error) {
            set({ status: 'error', error: message(error) });
          }
        })();
        return initializing;
      },

      run(action) {
        const { data } = get();
        if (!data) return;
        const result = action(data, now());
        if (result.data !== data) commit(result.data, result.events);
        else if (result.events.length) set(state => ({ events: [...state.events, ...result.events] }));
      },

      startWorkout(planId, dayKey) {
        const { data } = get();
        if (!data) return false;
        const session = startSession(data, planId, dayKey, now(), makeId());
        if (!session) return false;
        set({ session });
        sessionPersister.schedule(session);
        return true;
      },

      updateSession(change) {
        const { session } = get();
        if (!session) return;
        const next = change(session);
        if (next === session) return;
        set({ session: next });
        sessionPersister.schedule(next);
      },

      discardWorkout() {
        set({ session: null });
        sessionPersister.schedule(null);
      },

      finishWorkout() {
        const { data, session } = get();
        if (!data || !session) return 'no-session';
        const result = actions.finishWorkout(data, session, now());
        if (result.kind === 'empty') return 'empty';
        commit(result.data, result.events);
        set({ session: null });
        sessionPersister.schedule(null);
        return 'saved';
      },

      takeEvents() {
        const { events } = get();
        if (events.length) set({ events: [] });
        return events;
      },

      async flush() {
        await Promise.all([dataPersister.flush(), sessionPersister.flush()]);
      }
    };
  });
  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
