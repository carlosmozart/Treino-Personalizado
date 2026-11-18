// Z1: criar ou editar um protocolo (nome, tipo, início, duração e as substâncias).
import { useState } from 'react';
import { toDateKey } from '../../domain/dates';
import type { DayKey } from '../../domain/ai-plan';
import { DAY_FULL_NAMES, type DoseRoute, type DoseUnit, type Protocol, type ProtocolItem, type ProtocolKind, type SubstanceCategory } from '../../domain/model';
import { CATEGORIES, COMMON_SUBSTANCES, doseText, MAX_DOSE, MAX_ITEMS, MAX_NAME, MAX_NOTE, PROTOCOL_KINDS, ROUTES, saveProtocol, UNITS, weeklyAmount } from '../../domain/protocol';
import { MAX_HALF_LIFE_HOURS, MIN_HALF_LIFE_HOURS } from '../../domain/protocol-curve';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';
const DAYS: readonly DayKey[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
const chip = (on: boolean) => `h-10 rounded-full px-3 text-sm font-semibold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`;

const newItem = (): ProtocolItem => ({ id: crypto.randomUUID(), name: '', category: 'hormonio', route: 'im', dose: 0, unit: 'mg', schedule: { every: 7 } });

export function ProtocolEditor({ initial, onClose }: { initial?: Protocol; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const [p, setP] = useState<Protocol>(() => initial ?? {
    id: crypto.randomUUID(), name: '', kind: 'ciclo', startDate: toDateKey(new Date()), weeks: 12, items: [newItem()]
  });
  const continuous = p.weeks === undefined;
  const setItem = (next: ProtocolItem) => setP({ ...p, items: p.items.map(i => (i.id === next.id ? next : i)) });
  const save = () => {
    const before = useAppStore.getState().data;
    // "até a semana" vazio (0) = até o fim
    const items = p.items.map(i => { if (i.toWeek) return i; const { toWeek: _t, ...rest } = i; return rest; });
    run((d, now) => saveProtocol(d, { ...p, items }, now));
    if (useAppStore.getState().data !== before) onClose();
  };
  const itemOk = (i: ProtocolItem) => i.name.trim() && i.dose > 0 && ('every' in i.schedule || i.schedule.weekdays.length > 0) && (!i.toWeek || i.toWeek >= (i.fromWeek ?? 1));
  const valid = !!p.name.trim() && !!p.startDate && (continuous || (p.weeks ?? 0) >= 1) && p.items.length > 0 && p.items.every(itemOk);

  return (
    <Sheet title={initial ? 'Editar protocolo' : 'Novo protocolo'} open onClose={onClose}>
      <div className="space-y-3 pb-2">
        <label className="block text-sm font-semibold text-muted">Nome
          <input value={p.name} maxLength={MAX_NAME} onChange={e => setP({ ...p, name: e.target.value })} placeholder="Ex.: Ciclo de verão, Reposição" className={INPUT} />
        </label>
        <div role="radiogroup" aria-label="Tipo de protocolo" className="flex flex-wrap gap-1.5">
          {PROTOCOL_KINDS.map(k => (
            <button key={k.id} type="button" role="radio" aria-checked={p.kind === k.id} onClick={() => setP({ ...p, kind: k.id as ProtocolKind })} className={chip(p.kind === k.id)}>{k.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-muted">Começa em
            <input type="date" value={p.startDate} onChange={e => setP({ ...p, startDate: e.target.value })} className={INPUT} />
          </label>
          <div className="text-sm font-semibold text-muted">Duração (semanas)
            {continuous ? <p className="mt-1 flex h-12 items-center text-base text-ink">Contínuo</p>
              : <div className="mt-1"><NumberField label="Duração em semanas" value={p.weeks ?? 0} onChange={n => setP({ ...p, weeks: Math.min(520, Math.max(0, Math.round(n))) })} /></div>}
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" role="switch" checked={continuous} onChange={e => { const { weeks: _w, ...rest } = p; setP(e.target.checked ? rest : { ...rest, weeks: 12 }); }}
            className="size-6 accent-[var(--color-primary)]" />
          <span className="font-semibold">Sem data para acabar (reposição, tratamento contínuo)</span>
        </label>

        <h3 className="pt-2 font-bold">Substâncias</h3>
        <datalist id="substancias-comuns">{COMMON_SUBSTANCES.map(n => <option key={n} value={n} />)}</datalist>
        {p.items.map((i, n) => (
          <ItemFields key={i.id} item={i} index={n} weeks={p.weeks} onChange={setItem}
            onRemove={p.items.length > 1 ? () => setP({ ...p, items: p.items.filter(x => x.id !== i.id) }) : undefined} />
        ))}
        {p.items.length < MAX_ITEMS && (
          <button type="button" onClick={() => setP({ ...p, items: [...p.items, newItem()] })} className="h-11 w-full rounded-xl bg-surface-2 font-semibold">+ Outra substância</button>
        )}

        <label className="block text-sm font-semibold text-muted">Observação (opcional)
          <textarea value={p.note ?? ''} maxLength={MAX_NOTE} rows={2} onChange={e => setP({ ...p, note: e.target.value })}
            placeholder="Ex.: quem prescreveu, objetivo, exames combinados" className="mt-1 w-full rounded-xl border border-line bg-surface-2 p-3 text-base text-ink" />
        </label>
        <p className="text-xs text-faint">O app só guarda o que você informa. Ele não indica substâncias nem doses e não substitui o acompanhamento médico.</p>
        <button type="button" disabled={!valid} onClick={save} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">Salvar protocolo</button>
      </div>
    </Sheet>
  );
}

function ItemFields({ item: i, index, weeks, onChange, onRemove }: {
  item: ProtocolItem; index: number; weeks: number | undefined; onChange: (next: ProtocolItem) => void; onRemove: (() => void) | undefined;
}) {
  const set = (patch: Partial<ProtocolItem>) => onChange({ ...i, ...patch });
  const fixedDays = 'weekdays' in i.schedule;
  const [partial, setPartial] = useState(i.fromWeek !== undefined || i.toWeek !== undefined);
  const label = `Substância ${index + 1}`;
  const weekly = i.dose > 0 && !('every' in i.schedule && i.schedule.every === 7) ? weeklyAmount(i) : 0;
  return (
    <fieldset aria-label={label} className="space-y-2 rounded-2xl border border-line p-3">
      <div className="flex items-center gap-2">
        <legend className="flex-1 text-sm font-bold text-muted">{label}</legend>
        {onRemove && <button type="button" onClick={onRemove} aria-label={`Tirar ${i.name || label}`} className="flex size-10 items-center justify-center rounded-full text-muted"><Icon name="lixo" className="size-5" /></button>}
      </div>
      <label className="block text-sm font-semibold text-muted">Nome
        <input list="substancias-comuns" value={i.name} maxLength={MAX_NAME} onChange={e => set({ name: e.target.value })} placeholder="Comece a digitar" className={INPUT} />
      </label>
      <div role="radiogroup" aria-label={`Categoria da ${label.toLowerCase()}`} className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => <button key={c.id} type="button" role="radio" aria-checked={i.category === c.id} onClick={() => set({ category: c.id as SubstanceCategory })} className={chip(i.category === c.id)}>{c.label}</button>)}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="text-sm font-semibold text-muted">Dose
          <div className="mt-1"><NumberField decimal label={`Dose da ${label.toLowerCase()}`} value={i.dose} onChange={n => set({ dose: Math.min(MAX_DOSE, Math.max(0, n)) })} /></div>
        </div>
        <label className="block text-sm font-semibold text-muted">Unidade
          <select value={i.unit} onChange={e => set({ unit: e.target.value as DoseUnit })} className={INPUT}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold text-muted">Via
        <select value={i.route} onChange={e => set({ route: e.target.value as DoseRoute })} className={INPUT}>
          {ROUTES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <div role="radiogroup" aria-label={`Frequência da ${label.toLowerCase()}`} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        <button type="button" role="radio" aria-checked={!fixedDays} onClick={() => set({ schedule: { every: 7 } })}
          className={`min-h-10 rounded-lg text-sm font-semibold ${!fixedDays ? 'bg-surface text-ink' : 'text-muted'}`}>A cada N dias</button>
        <button type="button" role="radio" aria-checked={fixedDays} onClick={() => set({ schedule: { weekdays: ['SEG', 'QUI'] } })}
          className={`min-h-10 rounded-lg text-sm font-semibold ${fixedDays ? 'bg-surface text-ink' : 'text-muted'}`}>Dias da semana</button>
      </div>
      {'every' in i.schedule ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span>A cada</span>
          <div className="w-24"><NumberField label={`Intervalo em dias da ${label.toLowerCase()}`} value={i.schedule.every} onChange={n => set({ schedule: { every: Math.min(90, Math.max(1, Math.round(n) || 1)) } })} /></div>
          <span>{i.schedule.every === 1 ? 'dia (todo dia)' : 'dias'}</span>
        </div>
      ) : (
        <div role="group" aria-label={`Dias da ${label.toLowerCase()}`} className="flex flex-wrap gap-1.5">
          {DAYS.map(d => {
            const days = 'weekdays' in i.schedule ? i.schedule.weekdays : [];
            const on = days.includes(d);
            return <button key={d} type="button" aria-pressed={on} aria-label={DAY_FULL_NAMES[d]} onClick={() => set({ schedule: { weekdays: on ? days.filter(x => x !== d) : [...days, d] } })}
              className={`size-10 rounded-full text-sm font-semibold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{DAY_FULL_NAMES[d].slice(0, 3)}</button>;
          })}
        </div>
      )}
      {weekly > 0 && <p className="text-sm text-muted">Dá {doseText(weekly, i.unit)} por semana.</p>}
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" role="switch" checked={partial} onChange={e => { setPartial(e.target.checked); const { fromWeek: _f, toWeek: _t, ...rest } = i; onChange(e.target.checked ? { ...rest, fromWeek: 1, ...(weeks ? { toWeek: weeks } : {}) } : rest); }}
          className="size-6 accent-[var(--color-primary)]" />
        <span className="text-sm font-semibold">Só em parte das semanas</span>
      </label>
      {partial && (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-semibold text-muted">Da semana
            <div className="mt-1"><NumberField label={`Semana em que a ${label.toLowerCase()} começa`} value={i.fromWeek ?? 1} onChange={n => set({ fromWeek: Math.max(1, Math.round(n) || 1) })} /></div>
          </div>
          <div className="text-sm font-semibold text-muted">Até a semana
            <div className="mt-1"><NumberField label={`Semana em que a ${label.toLowerCase()} termina`} value={i.toWeek ?? 0} onChange={n => set({ toWeek: Math.max(0, Math.round(n)) })} /></div>
          </div>
        </div>
      )}
      <HalfLifeField item={i} label={label} onChange={onChange} />
    </fieldset>
  );
}

/** Z2: meia-vida (opcional), em horas ou dias, só para a curva estimada. Guardada em horas. */
function HalfLifeField({ item: i, label, onChange }: { item: ProtocolItem; label: string; onChange: (next: ProtocolItem) => void }) {
  const [unit, setUnit] = useState<'h' | 'd'>(() => (i.halfLifeHours !== undefined && i.halfLifeHours < 48 ? 'h' : 'd'));
  const hours = i.halfLifeHours ?? 0;
  const shown = unit === 'd' ? Math.round((hours / 24) * 100) / 100 : hours;
  const put = (value: number, u: 'h' | 'd') => {
    const h = Math.min(MAX_HALF_LIFE_HOURS, Math.max(0, u === 'd' ? value * 24 : value));
    const { halfLifeHours: _h, ...rest } = i;
    onChange(h >= MIN_HALF_LIFE_HOURS ? { ...rest, halfLifeHours: Math.round(h * 100) / 100 } : rest);
  };
  return (
    <div className="border-t border-line pt-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="text-sm font-semibold text-muted">Meia-vida (opcional)
          <div className="mt-1"><NumberField decimal label={`Meia-vida da ${label.toLowerCase()}`} value={shown} onChange={n => put(n, unit)} /></div>
        </div>
        <label className="block text-sm font-semibold text-muted">Em
          <select aria-label={`Unidade da meia-vida da ${label.toLowerCase()}`} value={unit} onChange={e => { const u = e.target.value as 'h' | 'd'; setUnit(u); if (hours) put(shown, u); }} className={INPUT}>
            <option value="d">dias</option>
            <option value="h">horas</option>
          </select>
        </label>
      </div>
      <p className="mt-1 text-xs text-faint">Para desenhar a curva estimada. Use o valor da bula ou o que o seu médico indicar; o app não tem tabela de meias-vidas.</p>
    </div>
  );
}
