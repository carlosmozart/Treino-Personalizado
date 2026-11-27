import { create } from 'zustand';
import { createBackNavigation } from '../platform/back';

export const TABS = ['inicio', 'plano', 'treino', 'progresso', 'perfil'] as const;
export type Tab = (typeof TABS)[number];

/** As vistas do Progresso (Estatísticas, Metas, Histórico, Protocolo). */
export type ProgressView = 'stats' | 'goals' | 'history' | 'protocol';

interface UiState {
  tab: Tab;
  /** Muda de aba registrando no histórico, para o voltar do Android (O9). */
  setTab: (tab: Tab) => void;
  /** Ajuda: vista do Progresso a abrir na próxima vez (o atalho "Ir até lá"). Consumida pelo Progresso. */
  progressView: ProgressView | null;
  /** Ajuda aberta, começando pela área desta aba. */
  help: Tab | null;
  /** Tour guiado: passo atual (null = fora do tour). */
  tourStep: number | null;
}

const isTab = (t: string): t is Tab => (TABS as readonly string[]).includes(t);

/** Estado de navegação. Dados do usuário ficam na store do app, persistidos. */
export const useUiStore = create<UiState>(() => ({
  tab: 'inicio',
  setTab: tab => backNav.goTab(tab),
  progressView: null,
  help: null,
  tourStep: null
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
