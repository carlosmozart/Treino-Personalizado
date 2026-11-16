import { useState } from 'react';
import { cardLabel, DEFAULT_LAYOUT, isDefaultLayout, moveCard, parseLayout, serializeLayout, setCardShown, type ProgressLayout } from '../../domain/progress-layout';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';

const KEY = 'tp-progresso-cartoes';
const load = (): ProgressLayout => { try { return parseLayout(localStorage.getItem(KEY)); } catch { return DEFAULT_LAYOUT; } };
const save = (l: ProgressLayout) => {
  try { if (isDefaultLayout(l)) localStorage.removeItem(KEY); else localStorage.setItem(KEY, serializeLayout(l)); } catch { /* sem armazenamento: vale só até fechar o app */ }
};

/** X6: quais cartões do Progresso aparecem e em que ordem, guardado neste aparelho. */
export function useProgressLayout(): [ProgressLayout, (next: ProgressLayout) => void] {
  const [layout, setLayout] = useState(load);
  return [layout, next => { setLayout(next); save(next); }];
}

/** X6: painel para esconder, mostrar e reordenar os cartões da aba Estatísticas. */
export function ProgressLayoutSheet({ open, layout, onChange, onClose }: { open: boolean; layout: ProgressLayout; onChange: (next: ProgressLayout) => void; onClose: () => void }) {
  return (
    <Sheet title="Organizar esta tela" open={open} onClose={onClose}>
      <p className="px-1 pb-2 text-sm text-muted">Escolha o que aparece em Estatísticas e em que ordem. Esconder não apaga nada; vale só neste aparelho.</p>
      <ul className="divide-y divide-line">
        {layout.order.map((id, i) => {
          const label = cardLabel(id);
          const shown = !layout.hidden.includes(id);
          return (
            <li key={id} className="flex min-h-14 items-center gap-1">
              <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3">
                <input type="checkbox" role="switch" checked={shown} aria-label={`Mostrar ${label}`} onChange={e => onChange(setCardShown(layout, id, e.target.checked))}
                  className="size-6 shrink-0 accent-[var(--color-primary)]" />
                <span className={`truncate font-semibold ${shown ? '' : 'text-faint'}`}>{label}</span>
              </label>
              <button type="button" aria-label={`Subir ${label}`} disabled={i === 0} onClick={() => onChange(moveCard(layout, id, -1))}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 disabled:opacity-30"><Icon name="subir" className="size-5" /></button>
              <button type="button" aria-label={`Descer ${label}`} disabled={i === layout.order.length - 1} onClick={() => onChange(moveCard(layout, id, 1))}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 disabled:opacity-30"><Icon name="descer" className="size-5" /></button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid gap-2">
        {!isDefaultLayout(layout) && (
          <button type="button" onClick={() => onChange(DEFAULT_LAYOUT)} className="h-12 rounded-xl bg-surface-2 text-base font-bold">Voltar ao padrão</button>
        )}
        <button type="button" onClick={onClose} className="h-12 rounded-xl bg-primary text-base font-bold text-white">Pronto</button>
      </div>
    </Sheet>
  );
}
