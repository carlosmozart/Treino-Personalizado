import { updateMeta } from '../../domain/actions';
import { needsIosInstall } from '../../platform/ios-install';
import { useAppStore } from '../../store';

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="inline size-5 align-text-bottom text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

/** No iPhone, pelo navegador: ensina a instalar pela Tela de Início (o Safari não oferece sozinho). */
export function IosInstallNotice() {
  const seen = useAppStore(s => s.data?.meta.hintsSeen.iosInstall ?? false);
  const run = useAppStore(s => s.run);
  if (seen || !needsIosInstall()) return null;
  return (
    <section aria-label="Instalar no iPhone" className="rounded-2xl border border-primary bg-surface p-4">
      <h2 className="text-lg font-bold">Instale o app no iPhone</h2>
      <p className="mt-1 text-sm text-muted">Assim ele abre em tela cheia, funciona sem internet e o iPhone não apaga seus dados.</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-base">
        <li>Toque em <strong>Compartilhar</strong> <ShareIcon /> na barra do Safari.</li>
        <li>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</li>
        <li>Toque em <strong>Adicionar</strong> e abra o app pelo novo ícone.</li>
      </ol>
      <p className="mt-3 text-sm text-warning">Faça isso antes de começar: o que for registrado aqui no navegador não aparece no app do ícone, porque o iPhone guarda os dois separados.</p>
      <p className="mt-1 text-xs text-faint">No Chrome, o Compartilhar fica ao lado do endereço. Se não achar a opção, abra este link no Safari.</p>
      <button type="button" onClick={() => run(d => updateMeta(d, { hintsSeen: { iosInstall: true } }))}
        className="mt-3 h-11 w-full rounded-xl bg-surface-2 font-bold">Agora não</button>
    </section>
  );
}
