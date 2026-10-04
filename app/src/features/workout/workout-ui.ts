import { create } from 'zustand';

/** Estado só de tela do treino: o resumo exibido logo após finalizar. */
export const useWorkoutUi = create<{ summaryId: string | null; showSummary(id: string | null): void }>(set => ({
  summaryId: null,
  showSummary: id => set({ summaryId: id })
}));
