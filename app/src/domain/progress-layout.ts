// X6: a aba Estatísticas do Progresso tem cartões demais para uma tela só. A pessoa escolhe quais
// aparecem e em que ordem; a escolha fica no aparelho (não entra no backup nem na junção).

export const PROGRESS_CARDS = [
  { id: 'calor', label: 'Últimos 6 meses' },
  { id: 'volume', label: 'Volume semanal' },
  { id: 'desafios', label: 'Desafios do mês' },
  { id: 'series', label: 'Séries da semana' },
  { id: 'exercicio', label: 'Evolução por exercício' },
  { id: 'grupos', label: 'Séries por grupo' }
] as const;

export type ProgressCardId = (typeof PROGRESS_CARDS)[number]['id'];

export interface ProgressLayout { order: ProgressCardId[]; hidden: ProgressCardId[] }

const IDS = PROGRESS_CARDS.map(c => c.id);
const isId = (x: unknown): x is ProgressCardId => typeof x === 'string' && (IDS as string[]).includes(x);
const unique = (ids: ProgressCardId[]) => [...new Set(ids)];

export const DEFAULT_LAYOUT: ProgressLayout = { order: [...IDS], hidden: [] };

/**
 * Lê o que estava guardado. Cartão que não existe mais é ignorado; cartão novo (de uma versão
 * mais recente) entra visível, no lugar em que vem por padrão em relação aos vizinhos.
 */
export function parseLayout(raw: string | null | undefined): ProgressLayout {
  let saved: { order?: unknown; hidden?: unknown } = {};
  try { const v: unknown = JSON.parse(raw ?? ''); if (v && typeof v === 'object') saved = v as typeof saved; } catch { /* nada guardado */ }
  const order = unique(Array.isArray(saved.order) ? saved.order.filter(isId) : []);
  for (const id of IDS) {
    if (order.includes(id)) continue;
    // depois do vizinho anterior da ordem padrão que já está na lista
    const before = IDS.slice(0, IDS.indexOf(id)).reverse().find(x => order.includes(x));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
  }
  const hidden = unique(Array.isArray(saved.hidden) ? saved.hidden.filter(isId) : []);
  return { order, hidden };
}

export const serializeLayout = (l: ProgressLayout) => JSON.stringify(l);

/** Os cartões que aparecem, na ordem escolhida. */
export const visibleCards = (l: ProgressLayout): ProgressCardId[] => l.order.filter(id => !l.hidden.includes(id));

/** Sobe (-1) ou desce (+1) um cartão na lista. */
export function moveCard(l: ProgressLayout, id: ProgressCardId, delta: -1 | 1): ProgressLayout {
  const from = l.order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= l.order.length) return l;
  const order = [...l.order];
  [order[from], order[to]] = [order[to]!, order[from]!];
  return { ...l, order };
}

/** Mostra ou esconde um cartão. */
export function setCardShown(l: ProgressLayout, id: ProgressCardId, shown: boolean): ProgressLayout {
  const hidden = l.hidden.filter(x => x !== id);
  return { ...l, hidden: shown ? hidden : [...hidden, id] };
}

export const isDefaultLayout = (l: ProgressLayout) => l.hidden.length === 0 && l.order.every((id, i) => id === IDS[i]);

export const cardLabel = (id: ProgressCardId) => PROGRESS_CARDS.find(c => c.id === id)!.label;
