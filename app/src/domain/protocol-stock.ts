// Z7: estoque do frasco (ou da caixa) em uso. A pessoa informa quanto tinha ao abrir; o app
// desconta as doses registradas desde então e conta quantas aplicações ainda dá e até quando, pela
// agenda do protocolo. Só conta: não sugere comprar, repor nem mudar dose.
import { addDays, fromDateKey, toDateKey, type DateKey } from './dates';
import type { ActionResult } from './actions';
import type { AppData, DoseLog, DoseUnit, ItemStock, Protocol, ProtocolItem } from './model';
import { CONCENTRATION_UNITS, doseList, dosesDue, doseText, MAX_DOSE, protocolEnd, saveProtocol, volumeText } from './protocol';

/** Até onde a conta de "dá até" olha (2 anos). */
const HORIZON_DAYS = 730;
/** Com isso ou menos, o cartão avisa que está acabando. */
export const LOW_APPLICATIONS = 3;
export const LOW_DAYS = 7;

/** Em que se mede o estoque: ml com concentração; sem ela, a unidade da dose. */
export function stockUnit(item: Pick<ProtocolItem, 'unit' | 'perMl'>): DoseUnit {
  return item.perMl && item.perMl > 0 && CONCENTRATION_UNITS.includes(item.unit) ? 'ml' : item.unit;
}

/** Uma dose na unidade do estoque (null se não dá para converter, como mg sem concentração num frasco em ml). */
export function inStockUnit(dose: number, unit: DoseUnit, item: Pick<ProtocolItem, 'unit' | 'perMl'>, target: DoseUnit): number | null {
  if (unit === target) return dose;
  if (target === 'ml' && unit === item.unit && item.perMl && item.perMl > 0 && CONCENTRATION_UNITS.includes(unit)) return dose / item.perMl;
  return null;
}

export const stockText = (amount: number, unit: DoseUnit): string => (unit === 'ml' ? volumeText(amount) : doseText(Math.round(amount * 100) / 100, unit));

/** As doses que saíram deste frasco: as do item desde que abriu, e as avulsas com o mesmo nome. */
function usedDoses(data: Pick<AppData, 'doses'>, p: Protocol, item: ProtocolItem, stock: ItemStock): DoseLog[] {
  const name = item.name.trim().toLowerCase();
  const fromThisOne = (d: DoseLog) => d.date > stock.since || (d.date === stock.since && (!stock.openedAt || d.at > stock.openedAt));
  return doseList(data).filter(d => fromThisOne(d)
    && ((d.protocolId === p.id && d.itemId === item.id) || (!d.protocolId && d.name.trim().toLowerCase() === name)));
}

export type StockView =
  | { stale: true; stock: ItemStock }
  | {
    stale: false;
    stock: ItemStock;
    used: number;
    left: number;
    /** Quanto sai a cada dose prevista, na unidade do estoque. */
    perDose: number;
    /** Quantas doses previstas ainda cabem. */
    applications: number;
    /** A última dose prevista que o estoque cobre (ausente se não cobre nem a próxima). */
    lastCovered?: DateKey;
    /** A primeira dose prevista que já não cabe (ausente se dá até o fim do protocolo ou além do horizonte). */
    shortOn?: DateKey;
    /** Cobre todas as doses até o fim do protocolo. */
    enough: boolean;
    low: boolean;
  };

/** Estoque de uma substância (null se não foi informado). */
export function itemStock(data: Pick<AppData, 'protocols' | 'doses'>, p: Protocol, item: ProtocolItem, today: DateKey): StockView | null {
  const stock = item.stock;
  if (!stock) return null;
  // mudou a unidade ou a concentração depois de informar o frasco: a conta antiga não vale
  const perDose = inStockUnit(item.dose, item.unit, item, stock.unit);
  if (stock.unit !== stockUnit(item) || perDose === null || perDose <= 0) return { stale: true, stock };
  const used = usedDoses(data, p, item, stock).reduce((sum, d) => sum + (inStockUnit(d.dose, d.unit, item, stock.unit) ?? 0), 0);
  const left = Math.max(0, stock.amount - used);
  const applications = Math.floor((left + 1e-9) / perDose);

  // percorre a agenda a partir de hoje (as doses de hoje já registradas já saíram do frasco)
  const end = protocolEnd(p);
  let remaining = applications;
  let lastCovered: DateKey | undefined;
  let shortOn: DateKey | undefined;
  let date = today < p.startDate ? p.startDate : today;
  for (let i = 0; i <= HORIZON_DAYS && !shortOn; i++, date = addDays(date, 1)) {
    if (end && date > end) break;
    for (const due of dosesDue({ protocols: { [p.id]: p }, ...(data.doses ? { doses: data.doses } : {}) }, date)) {
      if (due.item.id !== item.id || due.taken) continue;
      if (remaining > 0) { remaining--; lastCovered = date; } else { shortOn = date; break; }
    }
  }
  const enough = !shortOn && !!end && (!lastCovered || lastCovered <= end);
  const soon = shortOn !== undefined && daysBetween(today, shortOn) <= LOW_DAYS;
  return { stale: false, stock, used, left, perDose, applications, ...(lastCovered ? { lastCovered } : {}), ...(shortOn ? { shortOn } : {}), enough, low: !enough && (applications <= LOW_APPLICATIONS || soon) };
}

const daysBetween = (a: DateKey, b: DateKey) => Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);

/** Informa (ou tira, com null) o frasco em uso de uma substância. Quantidade fora do lugar: nada muda. */
export function setStock(data: AppData, protocolId: string, itemId: string, stock: Omit<ItemStock, 'unit'> | null, now: Date): ActionResult {
  const p = data.protocols?.[protocolId];
  const item = p?.items.find(i => i.id === itemId);
  if (!p || !item) return { data, events: [] };
  let next: ProtocolItem;
  if (stock === null) {
    const { stock: _s, ...rest } = item;
    next = rest;
  } else {
    if (!(stock.amount > 0 && stock.amount <= MAX_DOSE) || !/^\d{4}-\d{2}-\d{2}$/.test(stock.since)) return { data, events: [] };
    // aberto hoje: as doses de hoje já registradas vieram do frasco anterior
    const openedAt = stock.since === toDateKey(now) ? { openedAt: now.toISOString() } : {};
    next = { ...item, stock: { amount: Math.round(stock.amount * 1000) / 1000, unit: stockUnit(item), since: stock.since, ...openedAt } };
  }
  return saveProtocol(data, { ...p, items: p.items.map(i => (i.id === itemId ? next : i)) }, now);
}
