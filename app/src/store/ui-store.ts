import { create } from 'zustand';

export const TABS = ['inicio', 'plano', 'treino', 'progresso', 'perfil'] as const;
export type Tab = (typeof TABS)[number];

interface UiState {
  tab: Tab;
  setTab: (tab: Tab) => void;
}

/** Estado de navegação. Dados do usuário ficarão em stores próprias (P3/P4), persistidas. */
export const useUiStore = create<UiState>(set => ({
  tab: 'inicio',
  setTab: tab => set({ tab })
}));
