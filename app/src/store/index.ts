// Instância usada pelo app. Os testes criam a sua com createAppStore e dependências falsas.
import { idbRepository } from '../storage/repository';
import { loadOrMigrate } from '../storage/startup';
import { createAppStore } from './app-store';

export const useAppStore = createAppStore({
  load: () => loadOrMigrate({ storage: localStorage, idb: indexedDB }),
  repo: idbRepository()
});

/** Grava o pendente quando o app vai para segundo plano: no Android ele pode ser encerrado ali. */
export function flushOnHide(target: Pick<Document, 'addEventListener' | 'visibilityState'> = document, win: Pick<Window, 'addEventListener'> = window) {
  const flush = () => { void useAppStore.getState().flush(); };
  target.addEventListener('visibilitychange', () => { if (target.visibilityState === 'hidden') flush(); });
  win.addEventListener('pagehide', flush);
}
