import { useUpdate, updatesAvailable } from '../../platform/app-update';
import { Sheet } from '../../ui/Sheet';
import { useAppStore } from '../../store';

/** Oferta de versão nova (aparece sozinha após a consulta automática). */
export function UpdateOffer() {
  const offer = useUpdate(s => s.offer);
  const dismiss = useUpdate(s => s.dismiss);
  const install = useUpdate(s => s.install);
  // não interrompe um treino: a oferta espera e aparece quando ele termina
  const training = useAppStore(s => s.session !== null);
  if (!offer || training) return null;
  const size = offer.size ? ` (${(offer.size / 1048576).toFixed(1).replace('.', ',')} MB)` : '';
  return (
    <Sheet title={`Versão ${offer.version} disponível`} open onClose={dismiss}>
      <p className="text-muted">Você está na {__APP_VERSION__}. A atualização{size} é baixada do GitHub, conferida e instalada pelo Android. <strong className="text-ink">Seus treinos e dados continuam no aparelho.</strong></p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={dismiss} className="h-12 rounded-xl bg-surface-2 font-bold">Agora não</button>
        <button type="button" onClick={() => void install(offer)} className="h-12 rounded-xl bg-primary font-bold text-white">Atualizar</button>
      </div>
    </Sheet>
  );
}

/** Botão e situação da atualização, em Perfil → Sobre. */
export function UpdateControls() {
  const status = useUpdate(s => s.status);
  const busy = useUpdate(s => s.busy);
  const check = useUpdate(s => s.check);
  if (!updatesAvailable()) return null;
  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void check(true)} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold disabled:opacity-50">
        Procurar atualização
      </button>
      {status && <p role="status" className="mt-2 text-sm text-muted">{status}</p>}
    </div>
  );
}

/**
 * X7: o download da atualização aparece em qualquer aba, no alto da tela, com o quanto já veio;
 * se falhar, o motivo fica até a pessoa fechar. Antes só dava para acompanhar em Perfil → Sobre.
 */
export function UpdateBanner() {
  const phase = useUpdate(s => s.phase);
  const percent = useUpdate(s => s.percent);
  const status = useUpdate(s => s.status);
  const close = useUpdate(s => s.closeNotice);
  if (phase === 'idle' || !status) return null;
  const failed = phase === 'failed';
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 mx-auto max-w-xl px-3 pt-2">
      <div role={failed ? 'alert' : 'status'} data-testid="aviso-da-atualizacao"
        className={`pointer-events-auto overflow-hidden rounded-2xl border bg-surface-2 shadow-xl ${failed ? 'border-danger/50' : 'border-line'}`}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <p className="min-w-0 flex-1 text-sm font-semibold">{status}</p>
          {failed && <button type="button" onClick={close} className="h-10 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold">Fechar</button>}
        </div>
        {phase === 'downloading' && (
          <div role="progressbar" aria-label="Download da atualização" aria-valuemin={0} aria-valuemax={100} {...(percent !== null ? { 'aria-valuenow': percent } : {})}
            className="h-1 bg-surface">
            <div className={`h-1 bg-primary ${percent === null ? 'w-1/3 animate-pulse' : ''}`} style={percent === null ? undefined : { width: `${percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
