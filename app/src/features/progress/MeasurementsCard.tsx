import { useState } from 'react';
import { saveMeasurements } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { MEASURES, measureSeries } from '../../domain/measurements';
import type { MeasureKey, Measurements } from '../../domain/model';
import { useAppStore } from '../../store';
import { LineChart } from '../../ui/LineChart';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { formatNumber, shortDate } from '../../ui/format';

/** S7: medidas do corpo, cada uma com a variação e o gráfico. */
export function MeasurementsCard() {
  const data = useAppStore(s => s.data);
  const [open, setOpen] = useState<MeasureKey | null>(null);
  const [logging, setLogging] = useState(false);
  if (!data) return null;
  const series = measureSeries(data);
  return (
    <section aria-label="Medidas do corpo" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Medidas</h2>
        <button type="button" onClick={() => setLogging(true)} className="h-10 rounded-xl bg-surface-2 px-3 text-sm font-semibold">+ Registrar</button>
      </div>
      {series.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Cintura, braço, coxa, % de gordura… Medir a cada duas ou quatro semanas mostra o que a balança não mostra.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {series.map(m => {
            const last = m.points.at(-1)!;
            return (
              <li key={m.id}>
                <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}
                  className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-right tabular-nums">
                    <span className="font-bold">{formatNumber(last.value)} {m.unit}</span>
                    {m.change !== null && m.change !== 0 && (
                      <span className="ml-2 text-sm text-muted">{m.change > 0 ? '+' : '−'}{formatNumber(Math.abs(m.change))} desde {shortDate(m.points[0]!.date)}</span>
                    )}
                  </span>
                </button>
                {open === m.id && m.points.length > 1 && (
                  <div className="pb-3">
                    <LineChart unit={m.unit} summary={`${m.label}: ${m.points.length} medições`}
                      points={m.points.map(p => ({ label: shortDate(p.date), value: p.value, date: p.date }))} />
                  </div>
                )}
                {open === m.id && m.points.length === 1 && <p className="pb-3 text-sm text-muted">Registre de novo daqui a algumas semanas para ver o gráfico.</p>}
              </li>
            );
          })}
        </ul>
      )}
      <LogSheet open={logging} onClose={() => setLogging(false)} />
    </section>
  );
}

/** Registrar as medidas de hoje; abre com as de hoje, se já houver. */
function LogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const today = toDateKey(new Date());
  const existing = useAppStore(s => s.data?.measurements?.[today]);
  const [values, setValues] = useState<Measurements>({});
  const shown = { ...existing, ...values };
  const close = () => { setValues({}); onClose(); };
  return (
    <Sheet title="Medidas de hoje" open={open} onClose={close}>
      <div className="px-1 pb-3">
        <p className="text-sm text-muted">Preencha só o que mediu. Fita no mesmo ponto, de manhã, sem roupa grossa.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MEASURES.map(m => (
            <label key={m.id} className="text-xs font-semibold text-muted">{m.label} ({m.unit})
              <NumberField label={`${m.label} em ${m.unit}`} decimal value={shown[m.id] ?? 0}
                onChange={n => setValues(v => ({ ...v, [m.id]: n }))} className="mt-1" />
            </label>
          ))}
        </div>
        <button type="button" onClick={() => { run((d, now) => saveMeasurements(d, today, shown, now)); close(); }}
          className="mt-4 h-12 w-full rounded-xl bg-primary font-bold text-white">
          Salvar
        </button>
      </div>
    </Sheet>
  );
}
