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

/** Aplica a cor de destaque (e guarda para o index.html aplicar antes do app carregar). */
export function applyAccent(id: AccentId | undefined) {
  const accent = ACCENTS.find(a => a.id === id) ?? ACCENTS[0]!;
  const root = document.documentElement;
  if (accent.id === 'azul') root.style.removeProperty('--color-primary');
  else root.style.setProperty('--color-primary', accent.hex);
  try { localStorage.setItem(ACCENT_KEY, accent.hex); } catch { /* sem armazenamento: só não evita o piscar */ }
}
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
