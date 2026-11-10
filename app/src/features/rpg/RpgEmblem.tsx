// Emblemas das classes (R1): SVG próprios, um por caminho, com desenho diferente em cada tema.
// A 2ª classe ganha moldura dourada. Nenhuma arte de jogo existente.
import type { PathId, RpgClass, RpgTheme } from '../../data/rpg-classes';

type EmblemKey = PathId | 'aprendiz';

export const PATH_COLOR: Record<EmblemKey, string> = {
  aprendiz: '#8a6a45', forca: '#3f6fb5', cardio: '#3d8a53', intensidade: '#6b5b95',
  constancia: '#c9a227', metodo: '#5a3fa8', volume: '#b0702c'
};

const CLASSIC: Record<EmblemKey, string> = {
  // cajado de aprendiz
  aprendiz: '<path d="M8 26 L24 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="24.5" cy="7.5" r="3" fill="currentColor"/>',
  // espada
  forca: '<path d="M16 3 L19 7 V20 H13 V7 Z" fill="currentColor"/><rect x="9" y="20" width="14" height="3" rx="1" fill="currentColor"/><rect x="14.5" y="23" width="3" height="6" fill="currentColor"/>',
  // arco e flecha
  cardio: '<path d="M9 4 Q26 16 9 28" fill="none" stroke="currentColor" stroke-width="3"/><path d="M9 4 V28" stroke="currentColor" stroke-width="1.5"/><path d="M6 16 H27 M23 12 L27 16 L23 20" fill="none" stroke="currentColor" stroke-width="2.5"/>',
  // adaga
  intensidade: '<path d="M22 4 L25 7 L13 19 L10 16 Z" fill="currentColor"/><path d="M8 18 L14 24 M6 26 L11 21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  // escudo com estrela
  constancia: '<path d="M16 4 L26 8 V15 Q26 24 16 28 Q6 24 6 15 V8 Z" fill="currentColor"/><path d="M16 10 L17.6 14 L22 14.3 L18.6 17 L19.7 21.3 L16 18.9 L12.3 21.3 L13.4 17 L10 14.3 L14.4 14 Z" fill="#fff" opacity=".85"/>',
  // cajado com estrela
  metodo: '<path d="M9 28 L19 11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M21 3 L23 8 L28 9 L24 12 L25 17 L21 14 L17 17 L18 12 L14 9 L19 8 Z" fill="currentColor"/>',
  // moeda
  volume: '<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 9 V23 M12 12 H18 Q21 12 21 14.5 Q21 17 18 17 H13 Q11 17 11 19.5 Q11 22 14 22 H20" fill="none" stroke="currentColor" stroke-width="2"/>'
};

const MAROMBA: Record<EmblemKey, string> = {
  // pintinho (o "frango")
  aprendiz: '<circle cx="16" cy="12" r="6" fill="currentColor"/><ellipse cx="16" cy="22" rx="9" ry="7" fill="currentColor"/><path d="M21.5 11.5 L26 12.5 L21.5 14" fill="currentColor"/><circle cx="18" cy="10.5" r="1.2" fill="#fff"/>',
  // halter
  forca: '<rect x="3" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="25" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="7" y="8" width="4" height="16" rx="1" fill="currentColor"/><rect x="21" y="8" width="4" height="16" rx="1" fill="currentColor"/><rect x="11" y="14.5" width="10" height="3" fill="currentColor"/>',
  // coração com batimento
  cardio: '<path d="M16 27 L5 16 Q1 11 5 7 Q10 3 16 9 Q22 3 27 7 Q31 11 27 16 Z" fill="currentColor"/><path d="M6 16 H12 L14 12 L17 20 L19 15 H26" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" opacity=".9"/>',
  // raio
  intensidade: '<path d="M18 3 L7 18 H15 L13 29 L25 13 H17 Z" fill="currentColor"/>',
  // calendário com visto
  constancia: '<rect x="5" y="7" width="22" height="20" rx="3" fill="currentColor"/><path d="M10 4 V9 M22 4 V9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M10.5 18 L14.5 22 L22 14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>',
  // prancheta (a planilha)
  metodo: '<rect x="6" y="5" width="20" height="24" rx="3" fill="currentColor"/><rect x="12" y="3" width="8" height="5" rx="1.5" fill="currentColor" stroke="#fff" stroke-width="1.2" opacity=".95"/><path d="M10 14 H22 M10 19 H22 M10 24 H17" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>',
  // pilha de anilhas
  volume: '<rect x="4" y="22" width="24" height="5" rx="2" fill="currentColor"/><rect x="7" y="15.5" width="18" height="5" rx="2" fill="currentColor"/><rect x="10" y="9" width="12" height="5" rx="2" fill="currentColor"/><rect x="15" y="3" width="2" height="26" fill="#fff" opacity=".6"/>'
};

export function emblemColor(cls: RpgClass): string {
  return PATH_COLOR[cls.path ?? 'aprendiz'];
}

/** Emblema redondo da classe. `size` em px. */
export function RpgEmblem({ cls, theme, size = 56, dim = false }: { cls: RpgClass; theme: RpgTheme; size?: number; dim?: boolean }) {
  const k: EmblemKey = cls.path ?? 'aprendiz';
  const art = (theme === 'maromba' ? MAROMBA : CLASSIC)[k];
  const color = PATH_COLOR[k];
  return (
    <span aria-hidden="true" className="relative inline-flex shrink-0 items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, background: dim ? 'var(--color-surface-2)' : color, color: dim ? 'var(--color-faint)' : '#fff',
        boxShadow: cls.tier === 2 && !dim ? '0 0 0 3px #e6b93a, 0 0 12px #e6b93a88' : undefined }}>
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} dangerouslySetInnerHTML={{ __html: art }} />
    </span>
  );
}
