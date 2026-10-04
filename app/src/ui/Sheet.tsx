import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { backNav } from '../store/ui-store';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Painel que sobe de baixo, usando <dialog> nativo (foco preso e Esc de graça). */
export function Sheet({ title, open, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // voltar do Android fecha o painel (O9)
  useEffect(() => (open ? backNav.pushLayer(() => closeRef.current()) : undefined), [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // jsdom e WebViews antigas não têm showModal: abre como diálogo simples
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }, [open]);

  if (!open) return null;
  return (
    <dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/60">
      <div className="safe-bottom mx-auto max-w-xl rounded-t-3xl border-t border-line bg-surface px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-11 items-center justify-center rounded-full text-muted">
            <Icon name="fechar" />
          </button>
        </div>
        <div className="mt-2 max-h-[80dvh] overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </dialog>
  );
}

export function SheetAction({ onClick, children, tone = 'normal' }: { onClick: () => void; children: ReactNode; tone?: 'normal' | 'danger' }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold active:bg-surface-2 ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}>
      {children}
    </button>
  );
}
