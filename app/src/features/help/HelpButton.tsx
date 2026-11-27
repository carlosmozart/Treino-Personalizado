import type { ReactNode } from 'react';
import { useUiStore } from '../../store/ui-store';

/** O "?" ao lado do título de cada tela: abre a Ajuda já na área desta aba. */
export function HelpButton() {
  return (
    <button type="button" data-help="ajuda" aria-label="Ajuda: onde fica cada função"
      onClick={() => useUiStore.setState({ help: useUiStore.getState().tab })}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base font-black text-muted">
      ?
    </button>
  );
}

/** Título da tela com o botão de Ajuda ao lado. */
export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-6">
      <h1 className="min-w-0 truncate text-3xl font-black tracking-tight">{children}</h1>
      <HelpButton />
    </div>
  );
}
