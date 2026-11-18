// Z1: registrar uma dose, a do dia (vinda do protocolo, já preenchida) ou uma avulsa.
import { useState } from 'react';
import { toDateKey } from '../../domain/dates';
import type { DoseRoute, DoseUnit, InjectionSite, ProtocolItem } from '../../domain/model';
import { COMMON_SUBSTANCES, isInjection, lastSite, logDose, MAX_DOSE, MAX_NAME, MAX_NOTE, nextSite, ROUTES, siteLabel, SITES, UNITS } from '../../domain/protocol';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { shortDate } from '../../ui/format';

const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';

export interface DoseTarget { protocolId: string; item: ProtocolItem; date: string }

export function DoseSheet({ target, onClose }: { target?: DoseTarget; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const doses = useAppStore(s => s.data?.doses);
  const today = toDateKey(new Date());
  const [name, setName] = useState(target?.item.name ?? '');
  const [dose, setDose] = useState(target?.item.dose ?? 0);
  const [unit, setUnit] = useState<DoseUnit>(target?.item.unit ?? 'mg');
  const [route, setRoute] = useState<DoseRoute>(target?.item.route ?? 'im');
  const [date, setDate] = useState(target?.date ?? today);
  const [site, setSite] = useState<InjectionSite | undefined>(() => nextSite({ ...(doses ? { doses } : {}) }, target?.item.route ?? 'im'));
  const [note, setNote] = useState('');
  const injection = isInjection(route);
  const last = lastSite({ ...(doses ? { doses } : {}) }, route);
  const valid = !!name.trim() && dose > 0 && !!date && date <= today;
  const changeRoute = (r: DoseRoute) => { setRoute(r); setSite(nextSite({ ...(doses ? { doses } : {}) }, r)); };
  const save = () => {
    if (!valid) return;
    run((d, now) => logDose(d, {
      id: crypto.randomUUID(), date, name, dose, unit, route,
      ...(target ? { protocolId: target.protocolId, itemId: target.item.id } : {}),
      ...(injection && site ? { site } : {}), ...(note.trim() ? { note } : {})
    }, now, today));
    onClose();
  };
  return (
    <Sheet title={target ? `Registrar ${target.item.name}` : 'Registrar dose'} open onClose={onClose}>
      <div className="space-y-3 pb-2">
        {!target && (
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
            <select value={unit} onChange={e => setUnit(e.target.value as DoseUnit)} className={INPUT}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-semibold text-muted">Via
            <select value={route} onChange={e => changeRoute(e.target.value as DoseRoute)} className={INPUT}>{ROUTES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          </label>
          <label className="block text-sm font-semibold text-muted">Dia
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={INPUT} />
          </label>
        </div>
        {injection && (
          <div>
            <p className="text-sm font-semibold text-muted">Local da aplicação</p>
            {last?.site && <p className="text-xs text-faint">Última: {siteLabel(last.site).toLowerCase()}, em {shortDate(last.date)}. Já deixamos o próximo marcado para alternar.</p>}
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
        <button type="button" disabled={!valid} onClick={save} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">Salvar dose</button>
      </div>
    </Sheet>
  );
}
