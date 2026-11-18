// Z1: diário de saúde: sintomas, pressão, exame de sangue ou uma nota.
import { useState } from 'react';
import { toDateKey } from '../../domain/dates';
import type { HealthEntryKind } from '../../domain/model';
import { addHealthEntry, EXAM_MARKERS, markerUnit, MAX_NOTE, SYMPTOMS } from '../../domain/protocol';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';
const TITLE: Record<HealthEntryKind, string> = { sintomas: 'Como você está', pressao: 'Pressão', exame: 'Exame de sangue', nota: 'Anotação' };

interface Row { key: string; name: string; value: number; unit: string }
const emptyRow = (): Row => ({ key: crypto.randomUUID(), name: '', value: 0, unit: '' });

export function HealthSheet({ kind, onClose }: { kind: HealthEntryKind; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const today = toDateKey(new Date());
  const [date, setDate] = useState(today);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sys, setSys] = useState(0);
  const [dia, setDia] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const filled = rows.filter(r => r.name.trim());
  const valid = !!date && date <= today && (kind === 'sintomas' ? symptoms.length > 0 || !!text.trim()
    : kind === 'pressao' ? sys >= 50 && dia >= 30 && dia < sys
      : kind === 'exame' ? filled.length > 0 : !!text.trim());
  const save = () => {
    if (!valid) return;
    run((d, now) => addHealthEntry(d, {
      id: crypto.randomUUID(), date, kind, ...(text.trim() ? { text } : {}),
      ...(kind === 'sintomas' ? { symptoms } : {}),
      ...(kind === 'pressao' ? { pressure: { sys, dia, ...(pulse ? { pulse } : {}) } } : {}),
      ...(kind === 'exame' ? { exam: filled.map(r => ({ name: r.name, value: r.value, unit: r.unit })) } : {})
    }, now, today));
    onClose();
  };
  const setRow = (key: string, patch: Partial<Row>) => setRows(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <Sheet title={TITLE[kind]} open onClose={onClose}>
      <div className="space-y-3 pb-2">
        <label className="block text-sm font-semibold text-muted">Dia
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={INPUT} />
        </label>
        {kind === 'sintomas' && (
          <div role="group" aria-label="Sintomas" className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map(s => {
              const on = symptoms.includes(s);
              return <button key={s} type="button" aria-pressed={on} onClick={() => setSymptoms(on ? symptoms.filter(x => x !== s) : [...symptoms, s])}
                className={`h-10 rounded-full px-3 text-sm font-semibold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{s}</button>;
            })}
          </div>
        )}
        {kind === 'pressao' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-sm font-semibold text-muted">Máxima<div className="mt-1"><NumberField label="Pressão máxima (sistólica)" value={sys} onChange={n => setSys(Math.round(n))} /></div></div>
              <div className="text-sm font-semibold text-muted">Mínima<div className="mt-1"><NumberField label="Pressão mínima (diastólica)" value={dia} onChange={n => setDia(Math.round(n))} /></div></div>
              <div className="text-sm font-semibold text-muted">Pulso<div className="mt-1"><NumberField label="Pulso (opcional)" value={pulse} onChange={n => setPulse(Math.round(n))} /></div></div>
            </div>
            <p className="text-xs text-faint">Em mmHg, como no aparelho: 120 por 80 é 120 e 80.</p>
          </>
        )}
        {kind === 'exame' && (
          <>
            <datalist id="marcadores">{EXAM_MARKERS.map(m => <option key={m.name} value={m.name} />)}</datalist>
            {rows.map((r, n) => (
              <div key={r.key} className="grid grid-cols-[1fr_5.5rem_4.5rem_auto] items-end gap-1.5">
                <label className="block text-xs font-semibold text-muted">Exame
                  <input list="marcadores" aria-label={`Exame ${n + 1}`} value={r.name} placeholder="Ex.: Hematócrito"
                    onChange={e => setRow(r.key, { name: e.target.value, ...(markerUnit(e.target.value) ? { unit: markerUnit(e.target.value)! } : {}) })} className={INPUT} />
                </label>
                <div className="text-xs font-semibold text-muted">Valor<div className="mt-1"><NumberField decimal label={`Valor do exame ${n + 1}`} value={r.value} onChange={v => setRow(r.key, { value: v })} /></div></div>
                <label className="block text-xs font-semibold text-muted">Unidade
                  <input aria-label={`Unidade do exame ${n + 1}`} value={r.unit} maxLength={12} onChange={e => setRow(r.key, { unit: e.target.value })} className={INPUT} />
                </label>
                <button type="button" aria-label={`Tirar exame ${n + 1}`} disabled={rows.length === 1} onClick={() => setRows(rows.filter(x => x.key !== r.key))}
                  className="flex size-11 items-center justify-center rounded-full text-muted disabled:opacity-30"><Icon name="lixo" className="size-5" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setRows([...rows, emptyRow()])} className="h-11 w-full rounded-xl bg-surface-2 font-semibold">+ Outro exame</button>
          </>
        )}
        <label className="block text-sm font-semibold text-muted">{kind === 'nota' ? 'Anotação' : 'Observação (opcional)'}
          <textarea value={text} maxLength={MAX_NOTE} rows={kind === 'nota' ? 4 : 2} onChange={e => setText(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface-2 p-3 text-base text-ink" />
        </label>
        <button type="button" disabled={!valid} onClick={save} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">Salvar</button>
      </div>
    </Sheet>
  );
}
