import { create } from 'zustand';
import { createBackNavigation } from '../platform/back';

export const TABS = ['inicio', 'plano', 'treino', 'progresso', 'perfil'] as const;
export type Tab = (typeof TABS)[number];

interface UiState {
  tab: Tab;
  /** Muda de aba registrando no histórico, para o voltar do Android (O9). */
  setTab: (tab: Tab) => void;
}

const isTab = (t: string): t is Tab => (TABS as readonly string[]).includes(t);

/** Estado de navegação. Dados do usuário ficam na store do app, persistidos. */
export const useUiStore = create<UiState>(() => ({
  tab: 'inicio',
  setTab: tab => backNav.goTab(tab)
}));

export const backNav = createBackNavigation(
  window.history,
  () => useUiStore.getState().tab,
  tab => useUiStore.setState({ tab: isTab(tab) ? tab : 'inicio' })
);

/** Liga o voltar do sistema (popstate) à navegação. Chamado uma vez na inicialização. */
export function listenBack(win: Pick<Window, 'addEventListener'> = window) {
  win.addEventListener('popstate', e => backNav.onPopState((e as PopStateEvent).state));
}
