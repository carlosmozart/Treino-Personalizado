import { useUpdate, updatesAvailable } from '../../platform/app-update';
import { Sheet } from '../../ui/Sheet';

/** Oferta de versão nova (aparece sozinha após a consulta diária). */
export function UpdateOffer() {
  const offer = useUpdate(s => s.offer);
  const dismiss = useUpdate(s => s.dismiss);
  const install = useUpdate(s => s.install);
  if (!offer) return null;
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
