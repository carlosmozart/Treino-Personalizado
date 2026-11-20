// Z1: registrar uma dose, a do dia (vinda do protocolo, já preenchida) ou uma avulsa. Z6: corrigir uma registrada.
import { useState } from 'react';
import { toDateKey } from '../../domain/dates';
import type { DoseLog, DoseRoute, DoseUnit, InjectionSite, ProtocolItem } from '../../domain/model';
import { COMMON_SUBSTANCES, doseVolume, isInjection, lastSite, logDose, MAX_DOSE, MAX_NAME, MAX_NOTE, nextSite, ROUTES, siteLabel, SITES, slotLabel, syringeUnits, UNITS, updateDose, volumeText } from '../../domain/protocol';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { shortDate } from '../../ui/format';

const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';

/** Dose prevista a registrar; `slot` é qual das `of` doses do dia (Z3). */
export interface DoseTarget { protocolId: string; item: ProtocolItem; date: string; slot?: number; of?: number }

export function DoseSheet({ target, editing, onClose }: { target?: DoseTarget; editing?: DoseLog; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const doses = useAppStore(s => s.data?.doses);
  // Z6: corrigindo uma dose do protocolo, a concentração vem do item dela
  const editingItem = useAppStore(s => (editing?.protocolId ? s.data?.protocols?.[editing.protocolId]?.items.find(i => i.id === editing.itemId) : undefined));
  const item = target?.item ?? editingItem;
  const today = toDateKey(new Date());
  const [name, setName] = useState(editing?.name ?? target?.item.name ?? '');
  const [dose, setDose] = useState(editing?.dose ?? target?.item.dose ?? 0);
  const [unit, setUnit] = useState<DoseUnit>(editing?.unit ?? target?.item.unit ?? 'mg');
  const [route, setRoute] = useState<DoseRoute>(editing?.route ?? target?.item.route ?? 'im');
  const [date, setDate] = useState(editing?.date ?? target?.date ?? today);
  const [site, setSite] = useState<InjectionSite | undefined>(() => (editing ? editing.site : nextSite({ ...(doses ? { doses } : {}) }, target?.item.route ?? 'im')));
  const [note, setNote] = useState(editing?.note ?? '');
  const [refused, setRefused] = useState(false);
  const injection = isInjection(route);
  const volume = item && unit === item.unit ? doseVolume(dose, unit, item.perMl) : null;
  const last = lastSite({ ...(doses ? { doses } : {}) }, route);
  const valid = !!name.trim() && dose > 0 && !!date && date <= today;
  const changeRoute = (r: DoseRoute) => { setRoute(r); setSite(nextSite({ ...(doses ? { doses } : {}) }, r)); };
  const save = () => {
    if (!valid) return;
    if (editing) {
      const before = useAppStore.getState().data;
      run((d, now) => updateDose(d, editing.id, { date, dose, unit, route, name, ...(injection && site ? { site } : {}), ...(note.trim() ? { note } : {}) }, now, today));
      // o dia novo já tem essa dose registrada: avisa em vez de fechar
      if (useAppStore.getState().data === before) { setRefused(true); return; }
      onClose();
      return;
    }
    run((d, now) => logDose(d, {
      id: crypto.randomUUID(), date, name, dose, unit, route,
      ...(target ? { protocolId: target.protocolId, itemId: target.item.id, ...(target.slot ? { slot: target.slot } : {}) } : {}),
      ...(injection && site ? { site } : {}), ...(note.trim() ? { note } : {})
    }, now, today));
    onClose();
  };
  return (
    <Sheet title={editing ? `Corrigir dose de ${editing.name}` : target ? `Registrar ${target.item.name}${target.of && target.of > 1 ? ` (${slotLabel(target.slot ?? 0, target.of)})` : ''}` : 'Registrar dose'} open onClose={onClose}>
      <div className="space-y-3 pb-2">
        {!target && !editing?.protocolId && (
          <label className="block text-sm font-semibold text-muted">O quê
            <input list="substancias-dose" value={name} maxLength={MAX_NAME} onChange={e => setName(e.target.value)} placeholder="Comece a digitar" className={INPUT} />
            <datalist id="substancias-dose">{COMMON_SUBSTANCES.map(n => <option key={n} value={n} />)}</datalist>
          </label>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="text-sm font-semibold text-muted">Dose
            <div className="mt-1"><NumberField decimal label="Dose" value={dose} onChange={n => setDose(Math.min(MAX_DOSE, Math.max(0, n)))} /></div>
          </div>
          <label className="block text-sm font-semibold text-muted">Unidade
            <select aria-label="Unidade da dose" value={unit} onChange={e => setUnit(e.target.value as DoseUnit)} className={INPUT}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
          </label>
        </div>
        {/* Z3: com a concentração do frasco, quantos ml são */}
        {volume !== null && dose > 0 && (
          <p className="text-sm text-muted" data-testid="volume-da-dose">
            = <strong className="text-ink">{volumeText(volume)}</strong>
            {route === 'sc' ? ` (${String(syringeUnits(volume)).replace('.', ',')} unidades na seringa de insulina de 100)` : ''}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-semibold text-muted">Via
            <select aria-label="Via" value={route} onChange={e => changeRoute(e.target.value as DoseRoute)} className={INPUT}>{ROUTES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          </label>
          <label className="block text-sm font-semibold text-muted">Dia
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={INPUT} />
          </label>
        </div>
        {injection && (
          <div>
            <p className="text-sm font-semibold text-muted">Local da aplicação</p>
            {last?.site && !editing && <p className="text-xs text-faint">Última: {siteLabel(last.site).toLowerCase()}, em {shortDate(last.date)}. Já deixamos o próximo marcado para alternar.</p>}
            <div role="radiogroup" aria-label="Local da aplicação" className="mt-1 flex flex-wrap gap-1.5">
              {SITES.filter(s => s.routes.includes(route)).map(s => (
                <button key={s.id} type="button" role="radio" aria-checked={site === s.id} onClick={() => setSite(s.id)}
                  className={`h-10 rounded-full px-3 text-sm font-semibold ${site === s.id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{s.label}</button>
              ))}
            </div>
          </div>
        )}
        <label className="block text-sm font-semibold text-muted">Observação (opcional)
          <input value={note} maxLength={MAX_NOTE} onChange={e => setNote(e.target.value)} placeholder="Ex.: lote novo, dor leve no local" className={INPUT} />
        </label>
        {refused && <p role="alert" className="text-sm text-warning">Esse dia já tem essa dose registrada. Escolha outro dia ou apague a outra antes.</p>}
        <button type="button" disabled={!valid} onClick={save} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">{editing ? 'Salvar correção' : 'Salvar dose'}</button>
      </div>
    </Sheet>
  );
}
