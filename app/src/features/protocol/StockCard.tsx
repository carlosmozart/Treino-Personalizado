// Z7: estoque do frasco (ou da caixa) de cada substância em uso: quanto resta, quantas aplicações
// ainda dá e até quando, pela agenda. A pessoa informa o frasco ao abrir; o app desconta as doses.
import { useState } from 'react';
import { toDateKey } from '../../domain/dates';
import type { DoseUnit, Protocol, ProtocolItem } from '../../domain/model';
import { doseText, volumeText } from '../../domain/protocol';
import { itemStock, setStock, stockText, stockUnit, type StockView } from '../../domain/protocol-stock';
import { useAppStore } from '../../store';
import { plural, shortDate } from '../../ui/format';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';
const UNIT_WORD: Partial<Record<DoseUnit, string>> = { comprimido: 'comprimidos', gota: 'gotas' };
const unitWord = (u: DoseUnit) => UNIT_WORD[u] ?? u;
/** Comprimido vem em caixa; o resto, em frasco. */
const isBox = (i: ProtocolItem) => i.unit === 'comprimido';

export function StockCard({ protocols, today }: { protocols: Protocol[]; today: string }) {
  const data = useAppStore(s => s.data);
  const [open, setOpen] = useState<{ p: Protocol; item: ProtocolItem } | null>(null);
  if (!data) return null;
  const rows = protocols.flatMap(p => p.items.map(item => ({ p, item, view: itemStock(data, p, item, today) })));
  if (!rows.length) return null;
  return (
    <section aria-label="Estoque" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Estoque</h2>
      <p className="mt-1 text-sm text-muted">Informe o frasco ao abrir: o app desconta as doses registradas e mostra até quando dá.</p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map(({ p, item, view }) => (
          <li key={`${p.id}-${item.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-semibold">{item.name}{protocols.length > 1 ? <span className="font-normal text-muted"> · {p.name}</span> : null}</p>
              <StockLine view={view} />
            </div>
            <button type="button" onClick={() => setOpen({ p, item })} aria-label={`${view ? (isBox(item) ? 'Caixa nova' : 'Frasco novo') : isBox(item) ? 'Informar a caixa' : 'Informar o frasco'} de ${item.name}`}
              className="h-10 shrink-0 rounded-xl bg-surface-2 px-3 text-sm font-semibold">{view ? (isBox(item) ? 'Caixa nova' : 'Frasco novo') : 'Informar'}</button>
          </li>
        ))}
      </ul>
      {open && <StockSheet p={open.p} item={open.item} onClose={() => setOpen(null)} />}
    </section>
  );
}

function StockLine({ view }: { view: StockView | null }) {
  if (!view) return <p className="text-sm text-muted">Não informado</p>;
  if (view.stale) return <p className="text-sm text-warning">A dose ou a concentração mudou: informe o frasco de novo.</p>;
  const { stock, left, applications } = view;
  const until = view.enough ? 'dá até o fim do protocolo'
    : applications === 0 ? 'não dá para a próxima dose'
      : view.lastCovered ? `dá até ${shortDate(view.lastCovered)}` : '';
  return (
    <p data-testid="estoque" className={`text-sm ${view.low ? 'font-semibold text-warning' : 'text-muted'}`}>
      Restam {stockText(left, stock.unit)} · {plural(applications, 'aplicação', 'aplicações')}{until ? ` · ${until}` : ''}
      <span className="block text-xs font-normal text-faint">aberto em {shortDate(stock.since)} com {stockText(stock.amount, stock.unit)}</span>
    </p>
  );
}

function StockSheet({ p, item, onClose }: { p: Protocol; item: ProtocolItem; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const today = toDateKey(new Date());
  const unit = stockUnit(item);
  const [amount, setAmount] = useState(0);
  const [since, setSince] = useState(today);
  const valid = amount > 0 && !!since && since <= today;
  const save = () => {
    if (!valid) return;
    run((d, now) => setStock(d, p.id, item.id, { amount, since }, now));
    onClose();
  };
  const remove = () => { run((d, now) => setStock(d, p.id, item.id, null, now)); onClose(); };
  return (
    <Sheet title={`${isBox(item) ? 'Caixa' : 'Frasco'} de ${item.name}`} open onClose={onClose}>
      <div className="space-y-3 pb-2">
        <label className="block text-sm font-semibold text-muted">Quanto tem ao abrir ({unitWord(unit)})
          <NumberField decimal label={`Quanto tem ao abrir, em ${unitWord(unit)}`} value={amount} onChange={setAmount} className="mt-1" />
        </label>
        {unit === 'ml' && <p className="text-xs text-faint">Com a concentração do protocolo, cada dose de {doseText(item.dose, item.unit)} conta em ml ({volumeText(item.dose / item.perMl!)}).</p>}
        <label className="block text-sm font-semibold text-muted">Dia em que abriu
          <input type="date" value={since} max={today} onChange={e => setSince(e.target.value)} className={INPUT} />
        </label>
        <p className="text-xs text-faint">As doses registradas a partir desse dia saem do frasco, as do protocolo e as avulsas com o mesmo nome.</p>
        <button type="button" disabled={!valid} onClick={save} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">Salvar</button>
        {item.stock && <button type="button" onClick={remove} className="h-11 w-full rounded-xl font-semibold text-muted">Não acompanhar o estoque</button>}
      </div>
    </Sheet>
  );
}
