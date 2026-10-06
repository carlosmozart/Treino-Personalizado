import { useEffect, useState } from 'react';
import { logWeight } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

/** Pesagem de hoje (entra no histórico); usado no Início e no Perfil. */
export function WeightLogSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: number | null }) {
  const run = useAppStore(s => s.run);
  const [value, setValue] = useState(initial ?? 70);
  useEffect(() => { if (open) setValue(initial ?? 70); }, [open, initial]);
  const save = () => { run((d, now) => logWeight(d, value, toDateKey(now), now)); onClose(); };
  return (
    <Sheet title="Registrar peso" open={open} onClose={onClose}>
      <label className="block text-sm font-semibold text-muted">Peso de hoje (kg)
        <NumberField label="Peso de hoje em kg" decimal value={value} onChange={setValue} className="mt-1" />
      </label>
      <button type="button" onClick={save} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Salvar</button>
    </Sheet>
  );
}
