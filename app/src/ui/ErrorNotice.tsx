import { useState } from 'react';
import { errorReport, useErrorLog } from '../platform/error-log';
import { Icon } from './Icon';
import { useAppStore } from '../store';

/** Aviso discreto de erro inesperado, com cópia dos detalhes para relatar (O12). */
export function ErrorNotice() {
  const notice = useErrorLog(s => s.notice);
  const saveError = useAppStore(s => s.saveError);
  const dismiss = useErrorLog(s => s.dismiss);
  const [copied, setCopied] = useState(false);
  if (saveError) {
    // gravação falhando (ex.: sem espaço): os dados ficam só na memória até voltar a gravar
    return (
      <div role="alert" className="fixed inset-x-0 bottom-36 z-50 mx-auto max-w-xl px-4">
        <p className="rounded-2xl border border-danger/60 bg-surface px-4 py-3 text-sm shadow-lg">
          <strong>Não foi possível salvar no aparelho.</strong> Libere espaço e não feche o app; ele tenta de novo a cada mudança. ({saveError})
        </p>
      </div>
    );
  }
  if (!notice) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(errorReport([notice], __APP_VERSION__, navigator.userAgent)); setCopied(true); }
    catch { setCopied(false); }
  };
  return (
    <div role="alert" className="fixed inset-x-0 bottom-36 z-50 mx-auto flex max-w-xl items-center gap-2 px-4">
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-danger/40 bg-surface px-4 py-2 shadow-lg">
        <p className="min-w-0 flex-1 text-sm">Algo deu errado. Seus dados continuam salvos.</p>
        <button type="button" onClick={() => void copy()} className="h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-primary">
          {copied ? 'Copiado' : 'Copiar detalhes'}
        </button>
        <button type="button" onClick={() => { dismiss(); setCopied(false); }} aria-label="Dispensar aviso" className="flex size-11 shrink-0 items-center justify-center text-muted">
          <Icon name="fechar" className="size-5" />
        </button>
      </div>
    </div>
  );
}
