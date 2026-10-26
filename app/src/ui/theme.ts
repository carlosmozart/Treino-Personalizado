// Tema claro/escuro. A escolha fica nas configurações; uma cópia vai para o localStorage para o
// index.html aplicar o tema antes do React carregar (sem piscar o escuro ao abrir no claro).
import type { AccentId, ThemePref } from '../domain/model';
import { isNative } from '../platform/platform';

export const THEME_KEY = 'tp-theme';
export const ACCENT_KEY = 'tp-accent';

/**
 * M25: cores de destaque. Todas com contraste de pelo menos 4,5:1 com o texto branco dos botões,
 * no claro e no escuro; verde e vermelho ficam de fora (já querem dizer "feito" e "apagar").
 */
export const ACCENTS: { id: AccentId; label: string; hex: string }[] = [
  { id: 'azul', label: 'Azul', hex: '#2563eb' },
  { id: 'roxo', label: 'Roxo', hex: '#7c3aed' },
  { id: 'rosa', label: 'Rosa', hex: '#db2777' },
  { id: 'laranja', label: 'Laranja', hex: '#c2410c' },
  { id: 'ciano', label: 'Ciano', hex: '#0e7490' }
];

/** Laranja de abóbora do Halloween (o mesmo contraste de 4,5:1 com o texto branco). */
export const PUMPKIN = '#c2410c';

/**
 * Aplica a cor de destaque (e guarda para o index.html aplicar antes do app carregar). `override`
 * é a cor do tema de época, que vale por cima da escolhida enquanto ele estiver ligado.
 */
export function applyAccent(id: AccentId | undefined, override?: string) {
  const accent = ACCENTS.find(a => a.id === id) ?? ACCENTS[0]!;
  const hex = override ?? accent.hex;
  const root = document.documentElement;
  if (!override && accent.id === 'azul') root.style.removeProperty('--color-primary');
  else root.style.setProperty('--color-primary', hex);
  try { localStorage.setItem(ACCENT_KEY, hex); } catch { /* sem armazenamento: só não evita o piscar */ }
}

export const SEASON_KEY = 'tp-season';
export type Season = 'halloween';
let season: Season | null = null;

/** Fundo do tema de época (data-season no <html>, cores no index.css). */
export function applySeason(next: Season | null) {
  season = next;
  const root = document.documentElement;
  if (next) root.dataset.season = next;
  else delete root.dataset.season;
  try {
    if (next) localStorage.setItem(SEASON_KEY, next);
    else localStorage.removeItem(SEASON_KEY);
  } catch { /* sem armazenamento: só não evita o piscar */ }
  applyTheme(current);
}

const BG = { dark: '#000000', light: '#f4f4f5' } as const;
const SEASON_BG = { dark: '#09060d', light: '#f8f3ec' } as const;

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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', (season ? SEASON_BG : BG)[t]);
  try { localStorage.setItem(THEME_KEY, pref ?? 'system'); } catch { /* sem armazenamento: só não evita o piscar */ }
  if (isNative()) void bars()?.setStyle({ style: t === 'light' ? 'LIGHT' : 'DARK' }).catch(() => {});
}

/** Acompanha a troca de tema do sistema quando a escolha é "Sistema". */
export function watchSystemTheme() {
  media()?.addEventListener('change', () => { if (!current || current === 'system') applyTheme(current); });
}
