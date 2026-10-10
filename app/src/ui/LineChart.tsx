import { useState, type PointerEvent } from 'react';

interface Point { label: string; value: number; date?: string }

// períodos do gráfico; 1 ano deixa peso, medidas e evolução úteis por mais tempo (ideia do openGym 1.4.1)
const RANGES = [
  { id: '30', label: '30 dias', days: 30 }, { id: '90', label: '90 dias', days: 90 },
  { id: '365', label: '1 ano', days: 365 }, { id: 'all', label: 'Tudo', days: 0 }
] as const;
type RangeId = (typeof RANGES)[number]['id'];

/** Pontos dentro do período (pelos últimos `days` dias até o ponto mais recente). */
export function inRange<T extends { date?: string }>(points: T[], days: number): T[] {
  const last = points.at(-1)?.date;
  if (!days || !last) return points;
  const cut = new Date(`${last}T12:00:00`);
  cut.setDate(cut.getDate() - days);
  const key = cut.toISOString().slice(0, 10);
  return points.filter(p => !p.date || p.date >= key);
}

/**
 * Gráfico de linha em SVG (M42): tocar ou arrastar o dedo mostra o valor do ponto; períodos
 * de 30/90 dias ou tudo quando os pontos têm data; resumo em texto para leitor de tela.
 * `reference` desenha uma linha tracejada (ex.: meta).
 */
export function LineChart({ points: all, unit, summary, reference }: { points: Point[]; unit: string; summary: string; reference?: number }) {
  const [range, setRange] = useState<RangeId>('all');
  const [active, setActive] = useState<number | null>(null);
  const dated = all.every(p => p.date) && all.length > 4;
  const points = dated ? inRange(all, RANGES.find(r => r.id === range)!.days) : all;
  const fmt = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} ${unit}`;

  const rangeButtons = dated && (
    <div role="group" aria-label="Período do gráfico" className="mb-2 flex gap-1">
      {RANGES.map(r => (
        <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => { setRange(r.id); setActive(null); }}
          className={`h-9 rounded-lg px-3 text-xs font-semibold ${range === r.id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>
          {r.label}
        </button>
      ))}
    </div>
  );
  if (points.length < 2) return <>{rangeButtons}<p className="text-sm text-muted">Poucos registros no período para desenhar a linha.</p></>;

  const W = 300, H = 110, PAD = 10;
  const values = points.map(p => p.value).concat(reference !== undefined ? [reference] : []);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    setActive(Math.round(Math.min(1, Math.max(0, (rel - PAD) / (W - PAD * 2))) * (points.length - 1)));
  };
  const shown = active !== null ? points[active] : undefined;

  return (
    <figure>
      {rangeButtons}
      <p className="h-5 text-sm font-semibold" aria-live="polite">{shown ? `${shown.label}: ${fmt(shown.value)}` : ''}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full touch-pan-y" role="img" aria-label={summary}
        onPointerDown={pick} onPointerMove={e => { if (e.buttons || e.pointerType !== 'mouse') pick(e); }}>
        {reference !== undefined && <line x1={PAD} x2={W - PAD} y1={y(reference)} y2={y(reference)} stroke="var(--color-success)" strokeDasharray="4 4" strokeWidth={1.5} />}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={i === active ? 5 : 3} fill="var(--color-primary)" />)}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD / 2} y2={H - PAD / 2} stroke="var(--color-muted)" strokeWidth={1} />}
      </svg>
      <figcaption className="flex justify-between text-xs text-faint">
        <span>{points[0]!.label}</span>
        <span>mín. {fmt(Math.min(...points.map(p => p.value)))} · máx. {fmt(Math.max(...points.map(p => p.value)))}</span>
        <span>{points.at(-1)!.label}</span>
      </figcaption>
      <p className="mt-1 text-xs text-faint">Toque ou arraste no gráfico para ver cada registro.</p>
    </figure>
  );
}
