// X6: dias do plano recolhidos (só o título e quantos exercícios), guardados neste aparelho.
import { useState } from 'react';

const KEY = 'tp-plano-recolhidos';
const load = (): string[] => {
  try { const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
};
const save = (ids: string[]) => { try { if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids)); else localStorage.removeItem(KEY); } catch { /* sem armazenamento: vale até fechar o app */ } };

export const collapseKey = (planId: string, dayKey: string) => `${planId}:${dayKey}`;

export interface CollapsedDays {
  has(id: string): boolean;
  toggle(id: string): void;
  /** Recolhe todos os dados, ou abre todos. */
  setAll(ids: string[], collapsed: boolean): void;
}

export function useCollapsedDays(): CollapsedDays {
  const [ids, setIds] = useState(load);
  const update = (next: string[]) => { setIds(next); save(next); };
  return {
    has: id => ids.includes(id),
    toggle: id => update(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]),
    setAll: (list, collapsed) => update(collapsed ? [...new Set([...ids, ...list])] : ids.filter(x => !list.includes(x)))
  };
}
