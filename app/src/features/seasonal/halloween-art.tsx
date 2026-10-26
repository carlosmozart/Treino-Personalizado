// Desenhos do Halloween, feitos à mão em SVG. As cores do corpo vêm das variáveis --hw-* do
// halloween.css (contorno claro no tema escuro, para o bicho preto não sumir no fundo).

/** Gatinho preto sentado, com chapéu de bruxa; o rabo balança e os olhos piscam (halloween.css). */
export function WitchCat({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 -14 60 78" width={size} height={size * 1.3} className={`hw-cat ${className}`} aria-hidden="true">
      <path className="hw-tail" d="M40 57 C55 57 59 44 53 35 C51 32 47 33 48.5 36.5 C52.5 43.5 49.5 51 40 52 Z" />
      <path className="hw-body" d="M18 61 C13.5 50 16 38 24 33 L36 33 C44 38 46.5 50 42 61 Z" />
      <ellipse className="hw-body" cx="24.5" cy="61" rx="4.2" ry="2.6" />
      <ellipse className="hw-body" cx="35.5" cy="61" rx="4.2" ry="2.6" />
      <path className="hw-body" d="M19.5 24 L14.5 11.5 L25.5 17.5 Z" />
      <path className="hw-body" d="M40.5 24 L45.5 11.5 L34.5 17.5 Z" />
      <circle className="hw-body" cx="30" cy="26" r="11" />
      <g className="hw-eyes">
        <ellipse cx="25.5" cy="26" rx="3" ry="3.4" fill="#facc15" />
        <ellipse cx="34.5" cy="26" rx="3" ry="3.4" fill="#facc15" />
        <ellipse cx="25.5" cy="26" rx="0.9" ry="2.6" fill="#111" />
        <ellipse cx="34.5" cy="26" rx="0.9" ry="2.6" fill="#111" />
      </g>
      <path d="M28.6 30.2 L31.4 30.2 L30 31.8 Z" fill="#f472b6" />
      <path d="M30 31.8 Q28.6 33.6 27.2 32.6 M30 31.8 Q31.4 33.6 32.8 32.6" className="hw-line" />
      <path d="M22 30 L15 29 M22 31.5 L15.5 32.5 M38 30 L45 29 M38 31.5 L44.5 32.5" className="hw-whisker" />
      <g className="hw-hat">
        <path d="M23 15 L30.5 -5 Q33.5 -10.5 39.5 -8.5 Q34.8 -6.8 33.6 -2 L37 15 Z" fill="#6d28d9" />
        <path d="M23.7 12.2 L36.3 12.2 L37 15 L23 15 Z" fill="#f97316" />
        <rect x="28.4" y="12" width="3.2" height="3" rx="0.6" fill="#fde047" />
        <ellipse cx="30" cy="15.4" rx="13.5" ry="3.1" fill="#5b21b6" />
      </g>
    </svg>
  );
}

/** Gatinho de chapéu numa vassoura, voando para a esquerda (cruza a lua no Progresso). */
export function BroomCat({ size = 72 }: { size?: number }) {
  return (
    <svg viewBox="0 0 90 70" width={size} height={size * 0.78} aria-hidden="true">
      <path d="M4 58 L70 50" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 50 L88 40 L86 46 L90 50 L86 54 L88 60 Z" fill="#d97706" />
      <path d="M70 50 L86 44 M70 50 L88 50 M70 50 L86 56" stroke="#92400e" strokeWidth="1" />
      <g transform="translate(14 -6) scale(0.82)">
        <WitchCatShape />
      </g>
    </svg>
  );
}

/** O gatinho sem o <svg> em volta, para compor com a vassoura. */
function WitchCatShape() {
  return (
    <g className="hw-cat">
      <path className="hw-body" d="M18 61 C13.5 50 16 38 24 33 L36 33 C44 38 46.5 50 42 61 Z" />
      <path className="hw-body" d="M40 57 C52 60 58 64 62 70 C56 68 50 64 40 61 Z" />
      <path className="hw-body" d="M19.5 24 L14.5 11.5 L25.5 17.5 Z" />
      <path className="hw-body" d="M40.5 24 L45.5 11.5 L34.5 17.5 Z" />
      <circle className="hw-body" cx="30" cy="26" r="11" />
      <ellipse cx="25.5" cy="26" rx="3" ry="3.4" fill="#facc15" />
      <ellipse cx="34.5" cy="26" rx="3" ry="3.4" fill="#facc15" />
      <ellipse cx="25.5" cy="26" rx="0.9" ry="2.6" fill="#111" />
      <ellipse cx="34.5" cy="26" rx="0.9" ry="2.6" fill="#111" />
      <path d="M23 15 L30.5 -5 Q33.5 -10.5 39.5 -8.5 Q34.8 -6.8 33.6 -2 L37 15 Z" fill="#6d28d9" />
      <path d="M23.7 12.2 L36.3 12.2 L37 15 L23 15 Z" fill="#f97316" />
      <ellipse cx="30" cy="15.4" rx="13.5" ry="3.1" fill="#5b21b6" />
    </g>
  );
}

/** Aranha pendurada pelo fio (o fio é desenhado fora, pelo componente). */
export function Spider({ size = 36 }: { size?: number }) {
  const legs = ['M17 19 Q9 12 5 17', 'M16 22 Q7 20 3 25', 'M16 25 Q8 27 5 33', 'M17 27 Q12 33 10 38'];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="hw-spider" aria-hidden="true">
      <g className="hw-legs">
        {legs.map(d => <path key={d} d={d} />)}
        {legs.map(d => <path key={`r${d}`} d={d} transform="translate(40 0) scale(-1 1)" />)}
      </g>
      <ellipse className="hw-body" cx="20" cy="26" rx="7" ry="8" />
      <path d="M18.4 23 L21.6 23 L20 26 L21.6 29 L18.4 29 L20 26 Z" fill="#f97316" />
      <circle className="hw-body" cx="20" cy="16" r="5" />
      <circle cx="18" cy="15.5" r="1.7" fill="#fff" />
      <circle cx="22" cy="15.5" r="1.7" fill="#fff" />
      <circle cx="18.3" cy="15.9" r="0.8" fill="#111" />
      <circle cx="21.7" cy="15.9" r="0.8" fill="#111" />
    </svg>
  );
}

/** Morcego; as asas batem pelo halloween.css. */
export function Bat({ size = 40 }: { size?: number }) {
  const wing = 'M21 11 C16 6 9 5 2 9 C5 10 6 12 6 14 C8 12 10 12 12 14 C13 12 16 12 18 15 Z';
  return (
    <svg viewBox="0 0 48 24" width={size} height={size / 2} className="hw-bat" aria-hidden="true">
      <g className="hw-wing"><path className="hw-body" d={wing} /></g>
      <g className="hw-wing"><path className="hw-body" d={wing} transform="translate(48 0) scale(-1 1)" /></g>
      <ellipse className="hw-body" cx="24" cy="13" rx="3.6" ry="5" />
      <path className="hw-body" d="M21.4 8.5 L21.6 4.5 L23.2 6.8 L24.8 6.8 L26.4 4.5 L26.6 8.5 Z" />
      <circle cx="22.8" cy="8.6" r="0.7" fill="#fca5a5" />
      <circle cx="25.2" cy="8.6" r="0.7" fill="#fca5a5" />
    </svg>
  );
}

/** Abóbora; acesa, o rosto brilha em amarelo. */
export function Pumpkin({ size = 44, lit = false }: { size?: number; lit?: boolean }) {
  return (
    <svg viewBox="0 0 44 40" width={size} height={size * 0.9} className={`hw-pumpkin${lit ? ' hw-lit' : ''}`} aria-hidden="true">
      <path d="M21 10 C20 6 22 2.5 25.5 1 L26.6 3.2 C24.4 4.4 23.8 6.6 24.2 10 Z" fill="#4d7c0f" />
      <ellipse cx="13" cy="24.5" rx="10" ry="13" fill="#ea580c" />
      <ellipse cx="31" cy="24.5" rx="10" ry="13" fill="#ea580c" />
      <ellipse cx="22" cy="24.5" rx="11" ry="14" fill="#f97316" />
      <path d="M15.5 13 Q12 24.5 15.5 36 M28.5 13 Q32 24.5 28.5 36" stroke="#c2410c" strokeWidth="1" fill="none" />
      <g className="hw-face">
        <path d="M13.5 21 L17.5 15.5 L20 21.5 Z" />
        <path d="M30.5 21 L26.5 15.5 L24 21.5 Z" />
        <path d="M21 24.5 L23 24.5 L22 22.5 Z" />
        <path d="M12 27.5 Q22 36 32 27.5 L29 28.6 L27.2 26.6 L24.6 29.4 L22 27.2 L19.4 29.4 L16.8 26.6 L15 28.6 Z" />
      </g>
    </svg>
  );
}

/** Lua cheia com duas crateras. */
export function Moon({ size = 52 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="hw-moon" aria-hidden="true">
      <circle cx="26" cy="26" r="22" fill="#fde68a" />
      <circle cx="18" cy="19" r="4" fill="#fcd34d" />
      <circle cx="32" cy="32" r="5.5" fill="#fcd34d" />
      <circle cx="33" cy="15" r="2.2" fill="#fcd34d" />
    </svg>
  );
}

/** Bala embrulhada, para a chuva de doces da abóbora achada. */
export function Candy({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 12" width="24" height="12" aria-hidden="true">
      <path d="M6 6 L0 1 L0 11 Z M18 6 L24 1 L24 11 Z" fill={color} opacity="0.75" />
      <circle cx="12" cy="6" r="5.5" fill={color} />
      <path d="M9 3 Q12 6 9 9 M13 2 Q16 6 13 10" stroke="#fff" strokeWidth="1" fill="none" opacity="0.6" />
    </svg>
  );
}

/** Teia no canto de cima à direita: raios saindo do canto e fios que cedem entre eles. */
export function Cobweb({ size = 72 }: { size?: number }) {
  const angles = [0, 15, 35, 55, 75, 90].map(a => (a * Math.PI) / 180);
  const point = (r: number, a: number) => [80 - r * Math.cos(a), r * Math.sin(a)] as const;
  const spokes = angles.slice(1, -1).map(a => { const [x, y] = point(84, a); return `M80 0 L${x.toFixed(1)} ${y.toFixed(1)}`; });
  const rings = [20, 38, 56, 72].map(r => angles.map((a, i) => {
    const [x, y] = point(r, a);
    if (i === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
    // o fio cede para o canto entre dois raios
    const [cx, cy] = point(r * 0.86, (a + angles[i - 1]!) / 2);
    return `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' '));
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className="hw-web" aria-hidden="true">
      <path d={[...spokes, ...rings].join(' ')} />
    </svg>
  );
}
