// Anel de tempo do descanso e do cronômetro da prancha: esvazia conforme o tempo passa e mostra o
// que falta no meio. Desenho próprio em SVG, nas cores do tema.

/** `fraction`: quanto ainda falta (1 = cheio, 0 = acabou). */
export function ProgressRing({ fraction, label, size = 64, stroke = 6, tone = 'primary' }: {
  fraction: number; label: string; size?: number; stroke?: number; tone?: 'primary' | 'warning';
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-page" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - f)}
          className={`${tone === 'warning' ? 'stroke-warning' : 'stroke-primary'} transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-black tabular-nums">{label}</span>
    </span>
  );
}
