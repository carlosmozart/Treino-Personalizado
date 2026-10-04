// Quando sincronizar: depois de cada mudança (com uma pequena espera para juntar toques), ao
// voltar a internet e em novas tentativas com intervalo crescente após falha. O que não subiu
// fica marcado como pendente, inclusive entre aberturas do app. Sem login (cloud null), não faz nada.
import type { AppData } from '../domain/model';
import { mergeAppData } from '../domain/sync';
import { syncOnce, type CloudStore } from './cloud';

export type SyncStatus = 'off' | 'idle' | 'pending' | 'syncing' | 'offline' | 'error';

/** O que o aparelho lembra da nuvem entre aberturas. */
export interface CloudState {
  revision: number | null;
  lastSyncedAt: string | null;
  /** Há mudanças locais ainda não enviadas. */
  dirty: boolean;
}

export const INITIAL_CLOUD_STATE: CloudState = { revision: null, lastSyncedAt: null, dirty: false };

export interface SyncControllerDeps {
  cloud: CloudStore | null;
  getData(): AppData | null;
  /** Aplica no aparelho o resultado da junção (só quando ele trouxe algo novo). */
  applyData(data: AppData): void;
  loadState(): Promise<CloudState>;
  saveState(state: CloudState): Promise<void>;
  isOnline(): boolean;
  onOnline(listener: () => void): () => void;
  onStatus?(status: SyncStatus, detail: { lastSyncedAt: string | null; error?: string }): void;
  now?(): Date;
  setTimer?(fn: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
  /** Espera depois de uma mudança antes de enviar. */
  debounceMs?: number;
}

const RETRY_MS = [5_000, 15_000, 60_000, 5 * 60_000];

export function createSyncController(deps: SyncControllerDeps) {
  const now = deps.now ?? (() => new Date());
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const debounceMs = deps.debounceMs ?? 3_000;

  let state: CloudState = { ...INITIAL_CLOUD_STATE };
  let timer: unknown = null;
  let running: Promise<void> | null = null;
  let failures = 0;
  let stopOnline: (() => void) | null = null;

  const report = (status: SyncStatus, error?: string) =>
    deps.onStatus?.(status, { lastSyncedAt: state.lastSyncedAt, ...(error ? { error } : {}) });

  async function save(next: CloudState) {
    state = next;
    await deps.saveState(state);
  }

  function schedule(ms: number) {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => { timer = null; void run(); }, ms);
  }

  async function run(): Promise<void> {
    if (!deps.cloud) return;
    if (running) return running;
    const data = deps.getData();
    if (!data) return;
    if (!deps.isOnline()) { report('offline'); return; }
    report('syncing');
    running = (async () => {
      try {
        const result = await syncOnce(deps.cloud!, data, state.revision);
        const current = deps.getData() ?? data;
        // mudanças feitas durante o envio continuam pendentes e entram na próxima rodada
        const changedMeanwhile = current !== data;
        if (result.mergedRemote) deps.applyData(changedMeanwhile ? mergeAppData(current, result.data) : result.data);
        failures = 0;
        await save({ revision: result.revision, lastSyncedAt: now().toISOString(), dirty: changedMeanwhile });
        if (changedMeanwhile) schedule(debounceMs);
        report(changedMeanwhile ? 'pending' : 'idle');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!deps.isOnline()) { report('offline'); return; }
        schedule(RETRY_MS[Math.min(failures, RETRY_MS.length - 1)]!);
        failures++;
        report('error', message);
      } finally {
        running = null;
      }
    })();
    return running;
  }

  return {
    /** Lê o estado guardado e, se houver algo pendente ou nunca sincronizou, sincroniza. */
    async start() {
      if (!deps.cloud) { report('off'); return; }
      state = await deps.loadState();
      stopOnline = deps.onOnline(() => { if (state.dirty || state.revision === null) void run(); });
      report(state.dirty ? 'pending' : 'idle');
      await run();
    },
    /** Chamar a cada mudança local nos dados. */
    async markDirty() {
      if (!deps.cloud) return;
      if (!state.dirty) await save({ ...state, dirty: true });
      report(deps.isOnline() ? 'pending' : 'offline');
      schedule(debounceMs);
    },
    /** Sincroniza agora (botão "Sincronizar" ou ao voltar para o app). */
    syncNow: run,
    stop() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      stopOnline?.();
      stopOnline = null;
    },
    get state(): CloudState { return { ...state }; }
  };
}

export type SyncController = ReturnType<typeof createSyncController>;
