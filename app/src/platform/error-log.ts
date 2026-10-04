// Registro de erros (O12): captura falhas não tratadas, mostra um aviso discreto e guarda as
// últimas para a pessoa copiar e relatar. Antes, uma falha só aparecia no console.
import { create } from 'zustand';

export interface ErrorEntry { at: string; message: string; detail: string }

interface ErrorLogState {
  entries: ErrorEntry[];
  /** Aviso visível (último erro ainda não dispensado). */
  notice: ErrorEntry | null;
  report(error: unknown, context?: string): void;
  dismiss(): void;
}

const KEY = 'vigor-error-log';
const MAX = 20;

function load(): ErrorEntry[] {
  try { const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.slice(-MAX) as ErrorEntry[] : []; }
  catch { return []; }
}

export function describeError(error: unknown, context = ''): Omit<ErrorEntry, 'at'> {
  const prefix = context ? `${context}: ` : '';
  if (error instanceof Error) return { message: prefix + error.message, detail: error.stack ?? error.message };
  const text = typeof error === 'string' ? error : (() => { try { return JSON.stringify(error); } catch { return String(error); } })();
  return { message: prefix + text, detail: text };
}

export const useErrorLog = create<ErrorLogState>((set, get) => ({
  entries: load(),
  notice: null,
  report(error, context) {
    const entry = { at: new Date().toISOString(), ...describeError(error, context) };
    const entries = [...get().entries, entry].slice(-MAX);
    try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* armazenamento indisponível */ }
    set({ entries, notice: entry });
  },
  dismiss: () => set({ notice: null })
}));

/** Texto para copiar e colar num relato. */
export function errorReport(entries: readonly ErrorEntry[], appVersion: string, userAgent: string): string {
  return [`Versão ${appVersion}`, userAgent, '', ...entries.map(e => `[${e.at}] ${e.message}\n${e.detail}`)].join('\n');
}

export function installGlobalErrorHandlers(win: Pick<Window, 'addEventListener'> = window) {
  const { report } = useErrorLog.getState();
  win.addEventListener('error', e => { const ev = e as ErrorEvent; report(ev.error ?? ev.message); });
  win.addEventListener('unhandledrejection', e => report((e as PromiseRejectionEvent).reason, 'Promessa'));
}
