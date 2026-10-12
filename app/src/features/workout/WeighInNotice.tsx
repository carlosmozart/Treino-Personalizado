import { useState } from 'react';
import { logWeight, updateSettings } from '../../domain/actions';
import type { ActiveSession } from '../../domain/session';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';

/** M40: com a opção ligada, pede o peso do dia no começo do treino (se ainda não pesou hoje). */
export function WeighInNotice({ session }: { session: ActiveSession }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [closed, setClosed] = useState(false);
  const [kg, setKg] = useState(data?.profile.weightKg ?? 0);
  if (!data || closed || session.backdated || !data.settings.weighBeforeWorkout) return null;
  if (data.profile.weighIns.some(w => w.date === session.date)) return null;
  return (
    <section aria-label="Peso de hoje" className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Peso de hoje</h2>
      <div className="mt-2 flex items-end gap-2">
        <label className="w-28 text-xs font-semibold text-muted">kg
          <NumberField label="Peso de hoje antes do treino" decimal value={kg} onChange={setKg} className="mt-1" />
        </label>
        <button type="button" disabled={!(kg > 20 && kg < 400)}
          onClick={() => { run((d, now) => logWeight(d, kg, session.date, now)); setClosed(true); }}
          className="h-11 rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50">Salvar</button>
        <button type="button" onClick={() => setClosed(true)} className="h-11 rounded-xl px-3 font-semibold text-muted">Agora não</button>
      </div>
      <button type="button" onClick={() => run((d, now) => updateSettings(d, { weighBeforeWorkout: false }, now))}
        className="mt-1 h-9 text-xs font-semibold text-faint">Não perguntar mais</button>
    </section>
  );
}
