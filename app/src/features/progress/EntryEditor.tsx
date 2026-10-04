import { useState } from 'react';
import { removeWorkoutEntry, updateWorkoutEntry } from '../../domain/actions';
import type { Workout, WorkoutEntry } from '../../domain/model';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { shortDate } from '../../ui/format';

/** Corrigir um exercício já registrado: séries, carga, reps ou cardio; ou apagá-lo. */
export function EntryEditor({ workout, index, onClose }: { workout: Workout; index: number; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const original = workout.entries[index]!;
  const [entry, setEntry] = useState<WorkoutEntry>(() => structuredClone(original));
  const unit = entry.mode === 'time' ? 'Segundos' : 'Reps';
  const setSet = (i: number, patch: Partial<WorkoutEntry['sets'][number]>) =>
    setEntry(e => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const save = () => { run((d, now) => updateWorkoutEntry(d, workout.id, index, entry, now)); onClose(); };
  const remove = () => {
    const last = workout.entries.length === 1;
    if (!confirm(last ? `Apagar ${original.name}? Era o único exercício: o treino de ${shortDate(workout.date)} será apagado.` : `Apagar ${original.name} deste treino?`)) return;
    run((d, now) => removeWorkoutEntry(d, workout.id, index, now));
    onClose();
  };

  return (
    <Sheet title={original.name} open onClose={onClose}>
      <p className="text-sm text-muted">Treino de {shortDate(workout.date)}{original.aggregated ? ' · registro antigo: as séries eram uma reconstrução; ao salvar, passam a valer como estão aqui' : ''}</p>
      {entry.mode === 'cardio' ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-muted">Minutos
            <NumberField label="Minutos" value={entry.cardio?.minutes ?? 0} className="mt-1"
              onChange={minutes => setEntry(e => ({ ...e, cardio: { ...e.cardio, minutes } }))} />
          </label>
          <label className="text-sm font-semibold text-muted">Km
            <NumberField label="Km" decimal value={entry.cardio?.km ?? 0} className="mt-1"
              onChange={km => setEntry(e => ({ ...e, cardio: { minutes: e.cardio?.minutes ?? 0, km } }))} />
          </label>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[3rem_1fr_1fr_2.75rem] gap-2 text-xs font-semibold text-muted">
            <span>Série</span><span>Carga (kg)</span><span>{unit}</span><span className="sr-only">Remover</span>
          </div>
          {entry.sets.map((s, i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr_1fr_2.75rem] items-center gap-2">
              <span className="text-center font-bold">{s.kind === 'warmup' ? 'Aq' : i + 1}</span>
              <NumberField label={`Carga da série ${i + 1}`} decimal value={s.weight} onChange={weight => setSet(i, { weight })} />
              <NumberField label={`${unit} da série ${i + 1}`} value={s.reps} onChange={reps => setSet(i, { reps })} />
              <button type="button" aria-label={`Remover série ${i + 1}`} onClick={() => setEntry(e => ({ ...e, sets: e.sets.filter((_, j) => j !== i) }))}
                className="flex size-11 items-center justify-center text-muted"><Icon name="fechar" className="size-5" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setEntry(e => ({ ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { reps: 10, weight: 0 }), kind: 'work' }] }))}
            className="h-11 w-full rounded-xl border border-dashed border-line font-semibold text-muted">Adicionar série</button>
        </div>
      )}
      <button type="button" onClick={save} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Salvar correção</button>
      <button type="button" onClick={remove} className="mt-2 flex h-11 items-center gap-2 px-2 font-semibold text-danger">
        <Icon name="lixo" className="size-5" /> Apagar este exercício do treino
      </button>
    </Sheet>
  );
}
