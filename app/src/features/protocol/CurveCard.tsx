// Z2: curva estimada de uma substância (meia-vida informada pela pessoa). Uma substância por vez,
// na cor de destaque do app; tocar ou arrastar mostra o valor; tabela por semana para quem prefere.
import { useState, type PointerEvent } from 'react';
import { toDateKey } from '../../domain/dates';
import type { Protocol, ProtocolItem } from '../../domain/model';
import { estimateCurve, halfLifeText, type CurveMode } from '../../domain/protocol-curve';
import { doseText } from '../../domain/protocol';
import { useAppStore } from '../../store';
import { useNow } from '../../hooks/use-now';
import { shortDate } from '../../ui/format';

const W = 320, H = 150, L = 6, R = 6, T = 14, B = 6;

const amount = (n: number, unit: ProtocolItem['unit']) => doseText(n >= 100 ? Math.round(n) : Math.round(n * 10) / 10, unit);
const when = (t: number) => { const d = new Date(t); return `${shortDate(toDateKey(d))}, ${d.getHours()}h`; };

export function CurveCard({ protocols }: { protocols: Protocol[] }) {
  const doses = useAppStore(s => s.data?.doses);
  const now = new Date(useNow(60_000));
  const options = protocols.flatMap(p => p.items.filter(i => i.halfLifeHours).map(i => ({ p, i, id: `${p.id}:${i.id}` })));
  const [chosen, setChosen] = useState<string | null>(null);
  const [mode, setMode] = useState<CurveMode>('plan');
  const [active, setActive] = useState<number | null>(null);
  if (!options.length) {
    return (
      <section aria-label="Curva estimada" className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Curva estimada</h2>
        <p className="mt-1 text-sm text-muted">Informe a meia-vida de uma substância (em Editar protocolo) para ver como a quantidade ativa sobe e desce ao longo das semanas.</p>
      </section>
    );
  }
  const pick = options.find(o => o.id === chosen) ?? options[0]!;
  const curve = estimateCurve({ ...(doses ? { doses } : {}) }, pick.p, pick.i, mode, now);

  return (
    <section aria-label="Curva estimada" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Curva estimada</h2>
      {options.length > 1 && (
        <div role="radiogroup" aria-label="Substância da curva" className="mt-2 flex flex-wrap gap-1.5">
          {options.map(o => (
            <button key={o.id} type="button" role="radio" aria-checked={o.id === pick.id} onClick={() => { setChosen(o.id); setActive(null); }}
              className={`h-10 rounded-full px-3 text-sm font-semibold ${o.id === pick.id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{o.i.name}</button>
          ))}
        </div>
      )}
      <div role="radiogroup" aria-label="Doses da curva" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {([['plan', 'Previstas'], ['logged', 'Registradas']] as const).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setActive(null); }}
            className={`min-h-10 rounded-lg text-sm font-semibold ${mode === m ? 'bg-surface text-ink' : 'text-muted'}`}>{label}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {pick.i.name} · {doseText(pick.i.dose, pick.i.unit)} · meia-vida {halfLifeText(pick.i.halfLifeHours!)}
        {mode === 'logged' ? ' · até hoje, as doses que você registrou; daqui para frente, as previstas' : ''}
      </p>
      {!curve ? <p className="mt-2 text-sm text-muted">Sem doses para desenhar.</p> : <Plot curve={curve} unit={pick.i.unit} active={active} setActive={setActive} />}
      {curve && (
        <>
          <p className="mt-2 text-sm text-muted">Fica perto do estável depois de umas {curve.steadyWeeks} {curve.steadyWeeks === 1 ? 'semana' : 'semanas'} (cerca de 5 meias-vidas desde a primeira dose).</p>
          <details className="mt-2">
            <summary className="min-h-10 cursor-pointer text-sm font-semibold text-primary">Ver por semana</summary>
            <table className="mt-1 w-full text-sm">
              <thead><tr className="text-left text-faint"><th className="font-semibold">Semana</th><th className="text-right font-semibold">Maior</th><th className="text-right font-semibold">Menor</th></tr></thead>
              <tbody>
                {curve.weeks.map(w => (
                  <tr key={w.week} className="border-t border-line">
                    <td className="py-1">{w.week} <span className="text-faint">({shortDate(w.start)})</span></td>
                    <td className="py-1 text-right">{amount(w.max, pick.i.unit)}</td>
                    <td className="py-1 text-right">{amount(w.min, pick.i.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
      <p className="mt-2 text-xs text-faint">
        Estimativa simples: cada dose entra inteira e cai pela metade a cada meia-vida. Mostra a quantidade ainda ativa, não o nível no sangue (esse, só o exame). Metabolismo, idade e o próprio produto mudam muito o real.
      </p>
    </section>
  );
}

function Plot({ curve, unit, active, setActive }: { curve: NonNullable<ReturnType<typeof estimateCurve>>; unit: ProtocolItem['unit']; active: number | null; setActive: (i: number | null) => void }) {
  const pts = curve.points;
  const t0 = pts[0]!.t, t1 = pts.at(-1)!.t;
  const top = curve.max * 1.1 || 1;
  const x = (t: number) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(t1).toFixed(1)},${y(0)} L${x(t0).toFixed(1)},${y(0)} Z`;
  const pickAt = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = t0 + (((e.clientX - rect.left) / rect.width) * W - L) / (W - L - R) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i]!.t - t) < Math.abs(pts[best]!.t - t)) best = i;
    setActive(best);
  };
  const shown = active !== null ? pts[active] : undefined;
  const nowValue = curve.now !== null ? pts.reduce((a, b) => (Math.abs(b.t - curve.now!) < Math.abs(a.t - curve.now!) ? b : a)).value : null;
  const summary = `Curva estimada de ${shortDate(toDateKey(new Date(t0)))} a ${shortDate(toDateKey(new Date(t1)))}: máximo ${amount(curve.max, unit)}${nowValue !== null ? `, hoje cerca de ${amount(nowValue, unit)}` : ''}.`;
  return (
    <figure className="mt-2">
      <p className="h-5 text-sm font-semibold" aria-live="polite">
        {shown ? `${when(shown.t)}: ${amount(shown.value, unit)}` : nowValue !== null ? `Hoje: cerca de ${amount(nowValue, unit)}` : ''}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full touch-pan-y" role="img" aria-label={summary}
        onPointerDown={pickAt} onPointerMove={e => { if (e.buttons || e.pointerType !== 'mouse') pickAt(e); }} onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null); }}>
        {/* grade discreta: metade e topo */}
        {[0.5, 1].map(f => <line key={f} x1={L} x2={W - R} y1={y(curve.max * f)} y2={y(curve.max * f)} stroke="var(--color-line)" strokeWidth={1} />)}
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--color-line)" strokeWidth={1} />
        <path d={area} fill="var(--color-primary)" opacity={0.12} />
        <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {curve.now !== null && (
          <g>
            <line x1={x(curve.now)} x2={x(curve.now)} y1={T - 4} y2={y(0)} stroke="var(--color-ink)" strokeDasharray="3 3" strokeWidth={1} />
            <text x={x(curve.now)} y={T - 5} textAnchor={x(curve.now) > W - 30 ? 'end' : x(curve.now) < 30 ? 'start' : 'middle'} fontSize={10} fill="var(--color-muted)">hoje</text>
          </g>
        )}
        {shown && (
          <g>
            <line x1={x(shown.t)} x2={x(shown.t)} y1={T} y2={y(0)} stroke="var(--color-muted)" strokeWidth={1} />
            <circle cx={x(shown.t)} cy={y(shown.value)} r={4.5} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      <figcaption className="flex justify-between text-xs text-faint">
        <span>{shortDate(toDateKey(new Date(t0)))}</span>
        <span>máx. {amount(curve.max, unit)}</span>
        <span>{shortDate(toDateKey(new Date(t1)))}</span>
      </figcaption>
    </figure>
  );
}
