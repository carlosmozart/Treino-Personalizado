// Desenhos do Natal (V5), feitos à mão em SVG. O gatinho é o mesmo do Halloween, de gorro.
import { WitchCat } from './halloween-art';

/** Presente com laço; aberto, a tampa salta e solta brilhos. */
export function Gift({ size = 40, open = false, color = '#dc2626', ribbon = '#facc15' }: { size?: number; open?: boolean; color?: string; ribbon?: string }) {
  return (
    <svg viewBox="0 -6 40 46" width={size} height={size * 1.15} className={`nt-gift${open ? ' nt-open' : ''}`} aria-hidden="true">
      <rect x="6" y="17" width="28" height="21" rx="2" fill={color} />
      <rect x="18" y="17" width="4" height="21" fill={ribbon} />
      <g className="nt-lid">
        <rect x="4" y="11" width="32" height="7" rx="2" fill={color} style={{ filter: 'brightness(0.85)' }} />
        <rect x="18" y="11" width="4" height="7" fill={ribbon} />
        <ellipse cx="15" cy="8.5" rx="5" ry="3" fill={ribbon} transform="rotate(-25 15 8.5)" />
        <ellipse cx="25" cy="8.5" rx="5" ry="3" fill={ribbon} transform="rotate(25 25 8.5)" />
        <circle cx="20" cy="10" r="2" fill={ribbon} />
      </g>
      {open && (
        <g className="nt-sparks" fill="#fde047">
          <path d="M20 -5 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1z" />
          <path d="M8 2 l.7 2 2 .7 -2 .7 -.7 2 -.7 -2 -2 -.7 2 -.7z" />
          <path d="M33 1 l.7 2 2 .7 -2 .7 -.7 2 -.7 -2 -2 -.7 2 -.7z" />
        </g>
      )}
    </svg>
  );
}

/** Folha de azevinho (a ponta para a direita); usada em leque no canto. */
const LEAF = 'M0 0 C4 -5 7 1 11 -4 C13 1 17 -3 20 -1 C18 2 21 5 18 7 C15 5 13 9 10 6 C7 10 4 4 0 0 Z';

/** Azevinho no canto de cima à direita: três folhas e frutinhas vermelhas. */
export function Holly({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="nt-holly" aria-hidden="true">
      <path d={LEAF} fill="#15803d" transform="translate(62 2) rotate(150) scale(1.35)" />
      <path d={LEAF} fill="#166534" transform="translate(62 2) rotate(110) scale(1.4)" />
      <path d={LEAF} fill="#16a34a" transform="translate(62 2) rotate(185) scale(1.2)" />
      <circle cx="50" cy="14" r="4" fill="#dc2626" />
      <circle cx="56" cy="19" r="3.6" fill="#b91c1c" />
      <circle cx="45" cy="20" r="3.4" fill="#ef4444" />
      <circle cx="49" cy="13" r="1" fill="#fecaca" />
    </svg>
  );
}

const BULBS = ['#ef4444', '#facc15', '#22c55e', '#38bdf8'];

/** Pisca-pisca: um fio em arcos com lâmpadas coloridas que acendem e apagam (natal.css). */
export function FairyLights({ count = 9 }: { count?: number }) {
  const arcs = count;
  const wire = Array.from({ length: arcs }, (_, i) => `Q${i * 2 + 1} 9 ${(i + 1) * 2} 1`).join(' ');
  return (
    <div className="relative h-7 w-full" aria-hidden="true">
      <svg viewBox={`0 0 ${arcs * 2} 10`} preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-3 w-full">
        <path d={`M0 1 ${wire}`} stroke="#4b5563" strokeWidth="0.15" fill="none" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.2 }} />
      </svg>
      {Array.from({ length: arcs }, (_, i) => (
        <span key={i} className="nt-bulb absolute top-1.5" style={{ left: `calc(${((i + 0.5) / arcs) * 100}% - 5px)`, animationDelay: `${(i % 4) * 0.45}s`, color: BULBS[i % BULBS.length] }}>
          <svg viewBox="0 0 10 16" width="10" height="16">
            <rect x="3" y="0" width="4" height="4" rx="1" fill="#6b7280" />
            <ellipse cx="5" cy="9.5" rx="4" ry="5.5" fill="currentColor" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** Boneco de neve de cachecol, espiando do canto. */
export function Snowman({ size = 52 }: { size?: number }) {
  return (
    <svg viewBox="0 0 50 64" width={size} height={size * 1.28} className="nt-snowman" aria-hidden="true">
      <circle cx="25" cy="46" r="16" fill="#f8fafc" stroke="#cbd5e1" />
      <circle cx="25" cy="22" r="11" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="15" y="6" width="20" height="3" rx="1" fill="#1f2937" />
      <rect x="18" y="-3" width="14" height="10" rx="1.5" fill="#1f2937" />
      <rect x="18" y="4" width="14" height="2" fill="#dc2626" />
      <circle cx="21" cy="20" r="1.3" fill="#111827" />
      <circle cx="29" cy="20" r="1.3" fill="#111827" />
      <path d="M25 23 L34 25 L25 25.5 Z" fill="#f97316" />
      <path d="M20 27 Q25 30 30 27" stroke="#111827" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M14 31 Q25 36 36 31 L36 35 Q25 39 14 35 Z" fill="#dc2626" />
      <path d="M31 34 L34 46 L29 46 L28 35 Z" fill="#b91c1c" />
      <circle cx="25" cy="42" r="1.3" fill="#111827" />
      <circle cx="25" cy="49" r="1.3" fill="#111827" />
    </svg>
  );
}

/** Trenó com o gatinho de gorro e uma rena na frente, voando para a esquerda. */
export function Sleigh({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 64" width={size} height={size * 0.53} aria-hidden="true">
      {/* rena */}
      <g fill="#92400e">
        <ellipse cx="22" cy="40" rx="11" ry="6" />
        <circle cx="10" cy="31" r="4.5" />
        <path d="M13 34 L16 38 L12 38 Z" />
        <path d="M14 45 L12 54 M19 45 L18 54 M27 45 L29 54 M31 44 L34 53" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d="M9 27 L6 19 M6 19 L3 17 M6 19 L8 16 M12 27 L14 19 M14 19 L12 16 M14 19 L17 17" stroke="#78350f" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="6.5" cy="31.5" r="1.6" fill="#ef4444" />
      <path d="M33 40 L58 44" stroke="#a16207" strokeWidth="1.2" />
      {/* trenó */}
      <path d="M58 30 L104 30 Q112 30 112 40 L112 46 L62 46 Q56 46 58 30 Z" fill="#dc2626" />
      <path d="M60 50 L108 50 Q116 50 116 44" stroke="#facc15" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M66 46 L66 50 M100 46 L100 50" stroke="#facc15" strokeWidth="2" />
      <g transform="translate(70 -4) scale(0.62)"><WitchCat size={60} hat="noel" /></g>
    </svg>
  );
}
