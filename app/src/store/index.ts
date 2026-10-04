// Instância usada pelo app. Os testes criam a sua com createAppStore e dependências falsas.
import { idbRepository } from '../storage/repository';
import { loadOrMigrate } from '../storage/startup';
import { createAppStore } from './app-store';
import { createSyncController } from '../sync/controller';

const repo = idbRepository();

export const useAppStore = createAppStore({
  load: () => loadOrMigrate({ storage: localStorage, idb: indexedDB }),
  repo,
  onDataChanged: () => { void syncController.markDirty(); }
});

/**
 * Sincronização com a nuvem. Sem login ainda (cloud null): fica desligada. Quando o Firebase
 * existir, `cloud` passa a ser a nuvem da conta conectada.
 */
export const syncController = createSyncController({
  cloud: null,
  getData: () => useAppStore.getState().data,
  applyData: data => useAppStore.getState().applySynced(data),
  loadState: () => repo.loadCloudState(),
  saveState: state => repo.saveCloudState(state),
  isOnline: () => navigator.onLine,
  onOnline: listener => {
    window.addEventListener('online', listener);
    return () => window.removeEventListener('online', listener);
  }
});

/** Grava o pendente quando o app vai para segundo plano: no Android ele pode ser encerrado ali. */
export function flushOnHide(target: Pick<Document, 'addEventListener' | 'visibilityState'> = document, win: Pick<Window, 'addEventListener'> = window) {
  const flush = () => { void useAppStore.getState().flush(); void syncController.syncNow(); };
  target.addEventListener('visibilitychange', () => { if (target.visibilityState === 'hidden') flush(); });
  win.addEventListener('pagehide', flush);
}
