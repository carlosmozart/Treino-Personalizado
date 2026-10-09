import { useEffect, useRef } from 'react';

const ITEM = 40; // altura de cada linha (px)

/** Uma coluna que gira com o dedo e encaixa no valor; tocar num número também escolhe. */
function Column({ values, value, onChange, label, format }: {
  values: number[]; value: number; onChange: (v: number) => void; label: string; format: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * ITEM) > 2) el.scrollTo({ top: index * ITEM });
  }, [index]);

  return (
    <div className="relative h-40 flex-1">
      {/* faixa do valor escolhido */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-[60px] h-10 rounded-lg bg-surface" />
      <div ref={ref} role="listbox" aria-label={label} tabIndex={0}
        className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none]"
        onScroll={e => {
          const el = e.currentTarget;
          clearTimeout(settle.current);
          settle.current = window.setTimeout(() => {
            const v = values[Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)))]!;
            if (v !== value) onChange(v);
          }, 120);
        }}
        onKeyDown={e => {
          const next = e.key === 'ArrowDown' ? index + 1 : e.key === 'ArrowUp' ? index - 1 : -1;
          if (next >= 0 && next < values.length) { e.preventDefault(); onChange(values[next]!); }
        }}>
        <div style={{ height: ITEM * 1.5 }} />
        {values.map(v => (
          <button key={v} type="button" role="option" aria-selected={v === value} tabIndex={-1} onClick={() => onChange(v)}
            className={`flex h-10 w-full snap-center items-center justify-center text-xl tabular-nums ${v === value ? 'font-black text-ink' : 'text-faint'}`}>
            {format(v)}
          </button>
        ))}
        <div style={{ height: ITEM * 1.5 }} />
      </div>
    </div>
  );
}

const SECONDS = Array.from({ length: 12 }, (_, i) => i * 5);

/** R3: tempo em minutos e segundos (de 5 em 5), até `max` (padrão 15:55), no estilo das rodas do iPhone. */
export function DurationWheel({ seconds, onChange, label, min = 0, max = 955 }: { seconds: number; onChange: (s: number) => void; label: string; min?: number; max?: number }) {
  const MINUTES = Array.from({ length: Math.floor(max / 60) + 1 }, (_, i) => i);
  const m = Math.min(MINUTES.length - 1, Math.floor(seconds / 60));
  const s = Math.round((seconds % 60) / 5) * 5 % 60;
  const set = (mm: number, ss: number) => onChange(Math.min(max, Math.max(min, mm * 60 + ss)));
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 rounded-xl bg-surface-2 px-2">
      <Column values={MINUTES} value={m} onChange={v => set(v, s)} label={`${label}: minutos`} format={v => String(v)} />
      <span aria-hidden="true" className="text-xl font-black text-muted">:</span>
      <Column values={SECONDS} value={s} onChange={v => set(m, v)} label={`${label}: segundos`} format={v => String(v).padStart(2, '0')} />
    </div>
  );
}
