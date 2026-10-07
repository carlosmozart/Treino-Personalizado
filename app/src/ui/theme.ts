// Tema claro/escuro. A escolha fica nas configurações; uma cópia vai para o localStorage para o
// index.html aplicar o tema antes do React carregar (sem piscar o escuro ao abrir no claro).
import type { ThemePref } from '../domain/model';
import { isNative } from '../platform/platform';

export const THEME_KEY = 'tp-theme';
const BG = { dark: '#000000', light: '#f4f4f5' } as const;

// SystemBars vem no próprio Capacitor 8: LIGHT = ícones escuros sobre fundo claro
interface SystemBarsPlugin { setStyle(o: { style: 'LIGHT' | 'DARK' }): Promise<void> }
const bars = () => (globalThis as { Capacitor?: { Plugins?: { SystemBars?: SystemBarsPlugin } } }).Capacitor?.Plugins?.SystemBars;

const media = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : undefined);

export function resolveTheme(pref: ThemePref | undefined): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return media()?.matches ? 'light' : 'dark';
}

let current: ThemePref | undefined;

export function applyTheme(pref: ThemePref | undefined) {
  current = pref;
  const t = resolveTheme(pref);
  const root = document.documentElement;
  if (root.dataset.theme !== t) root.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[t]);
  try { localStorage.setItem(THEME_KEY, pref ?? 'system'); } catch { /* sem armazenamento: só não evita o piscar */ }
  if (isNative()) void bars()?.setStyle({ style: t === 'light' ? 'LIGHT' : 'DARK' }).catch(() => {});
}

/** Acompanha a troca de tema do sistema quando a escolha é "Sistema". */
export function watchSystemTheme() {
  media()?.addEventListener('change', () => { if (!current || current === 'system') applyTheme(current); });
}
