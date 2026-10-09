import { useEffect, useState } from 'react';
import { setDayNote } from '../../domain/actions';
import type { DateKey } from '../../domain/dates';
import type { DayNoteReason } from '../../domain/model';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';

export const REASONS: { id: DayNoteReason; label: string }[] = [
  { id: 'doente', label: 'Doente' },
  { id: 'viajando', label: 'Viajando' },
  { id: 'lesao', label: 'Lesão' },
  { id: 'outro', label: 'Outro motivo' }
];

export const reasonLabel = (id: DayNoteReason) => REASONS.find(r => r.id === id)?.label ?? '';

/** S8: o motivo de um dia sem treino. Com nota, o dia não quebra a sequência. */
export function DayNoteSheet({ date, title, onClose }: { date: DateKey | null; title: string; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const current = useAppStore(s => (date ? s.data?.dayNotes?.[date] : undefined));
  const [text, setText] = useState('');
  useEffect(() => { setText(current?.text ?? ''); }, [date, current?.text]);
  const save = (reason: DayNoteReason) => {
    if (!date) return;
    run((d, now) => setDayNote(d, date, { reason, text }, now));
    onClose();
  };
  return (
    <Sheet title={title} open={date !== null} onClose={onClose}>
      <div className="px-1 pb-3">
        <p className="text-sm text-muted">Não treinou neste dia? Anote o motivo: o dia não quebra a sequência.</p>
        <label className="mt-3 block text-sm font-semibold text-muted">Observação (opcional)
          <input value={text} maxLength={120} onChange={e => setText(e.target.value)} placeholder="Ex.: gripe, viagem a trabalho"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {REASONS.map(r => (
            <button key={r.id} type="button" onClick={() => save(r.id)} aria-pressed={current?.reason === r.id}
              className={`h-12 rounded-xl font-semibold ${current?.reason === r.id ? 'bg-primary text-white' : 'bg-surface-2'}`}>
              {r.label}
            </button>
          ))}
        </div>
        {current && (
          <button type="button" onClick={() => { if (date) run((d, now) => setDayNote(d, date, null, now)); onClose(); }}
            className="mt-3 h-11 w-full rounded-xl font-semibold text-danger">
            Apagar a nota
          </button>
        )}
      </div>
    </Sheet>
  );
}
