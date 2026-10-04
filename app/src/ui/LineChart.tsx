interface Point { label: string; value: number }

/**
 * Gráfico de linha simples em SVG, com valores mínimo e máximo e um resumo para leitor de tela.
 * `reference` desenha uma linha tracejada (ex.: meta).
 */
export function LineChart({ points, unit, summary, reference }: { points: Point[]; unit: string; summary: string; reference?: number }) {
  if (points.length < 2) return <p className="text-sm text-muted">Registre mais uma vez para ver a linha.</p>;
  const W = 300, H = 110, PAD = 8;
  const values = points.map(p => p.value).concat(reference !== undefined ? [reference] : []);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const fmt = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} ${unit}`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label={summary}>
        {reference !== undefined && <line x1={PAD} x2={W - PAD} y1={y(reference)} y2={y(reference)} stroke="var(--color-success)" strokeDasharray="4 4" strokeWidth={1.5} />}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill="var(--color-primary)" />)}
      </svg>
      <figcaption className="flex justify-between text-xs text-faint">
        <span>{points[0]!.label}</span><span>mín. {fmt(Math.min(...points.map(p => p.value)))} · máx. {fmt(Math.max(...points.map(p => p.value)))}</span><span>{points.at(-1)!.label}</span>
      </figcaption>
    </figure>
  );
}
