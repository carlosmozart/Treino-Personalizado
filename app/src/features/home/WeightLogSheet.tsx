import { useEffect, useState } from 'react';
import { logWeight } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { useAppStore } from '../../store';
import { formatNumber, shortDate } from '../../ui/format';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

/** Pesagem (entra no histórico); de hoje ou de um dia anterior (T2). Usado no Início e no Perfil. */
export function WeightLogSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: number | null }) {
  const run = useAppStore(s => s.run);
  const weighIns = useAppStore(s => s.data?.profile.weighIns);
  const today = toDateKey(new Date());
  const [value, setValue] = useState(initial ?? 70);
  const [date, setDate] = useState(today);
  useEffect(() => { if (open) { setValue(initial ?? 70); setDate(toDateKey(new Date())); } }, [open, initial]);
  const day = date && date <= today ? date : today;
  const label = day === today ? 'Peso de hoje' : `Peso de ${shortDate(day)}`;
  const existing = weighIns?.find(w => w.date === day);
  const save = () => { run((d, now) => logWeight(d, value, day, now)); onClose(); };
  return (
    <Sheet title="Registrar peso" open={open} onClose={onClose}>
      <label className="block text-sm font-semibold text-muted">{label} (kg)
        <NumberField label={`${label} em kg`} decimal value={value} onChange={setValue} className="mt-1" />
      </label>
      <label className="mt-3 block text-sm font-semibold text-muted">Data
        <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} aria-label="Data da pesagem"
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      </label>
      {existing && <p className="mt-2 text-xs text-faint">Já há {formatNumber(existing.weight)} kg nesse dia: a nova pesagem substitui.</p>}
      <button type="button" onClick={save} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Salvar</button>
    </Sheet>
  );
}
