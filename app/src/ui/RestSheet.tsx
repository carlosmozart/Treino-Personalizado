import { useEffect, useState } from 'react';
import { DurationWheel } from './DurationWheel';
import { Sheet } from './Sheet';
import { formatClock } from './format';

/** Descanso de um exercício: `undefined` = o padrão do app, 0 = sem cronômetro. */
export type ExerciseRest = number | undefined;

/** "1:30", "Sem cronômetro" ou "Padrão (1:30)". */
export function restLabel(seconds: ExerciseRest, fallback: number): string {
  if (seconds === undefined) return `Padrão (${formatClock(fallback)})`;
  return seconds === 0 ? 'Sem cronômetro' : formatClock(seconds);
}

const MODES = [['default', 'Padrão'], ['none', 'Sem'], ['own', 'Próprio']] as const;
type Mode = (typeof MODES)[number][0];
const modeOf = (s: ExerciseRest): Mode => (s === undefined ? 'default' : s === 0 ? 'none' : 'own');

/**
 * Escolher o descanso de um exercício: o padrão do app, sem cronômetro ou um tempo próprio na
 * roda. `toPlan` aparece no treino, para guardar no plano também (ligado por padrão).
 */
export function RestSheet({ open, title, seconds, fallback, toPlan, onClose, onSave }: {
  open: boolean; title: string; seconds: ExerciseRest; fallback: number; toPlan?: boolean;
  onClose: () => void; onSave: (seconds: ExerciseRest, savePlan: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>(modeOf(seconds));
  const [own, setOwn] = useState(seconds || fallback);
  const [savePlan, setSavePlan] = useState(true);
  useEffect(() => {
    if (!open) return;
    setMode(modeOf(seconds));
    setOwn(seconds || fallback);
  }, [open, seconds, fallback]);
  const value: ExerciseRest = mode === 'default' ? undefined : mode === 'none' ? 0 : own;
  return (
    <Sheet title={`Descanso: ${title}`} open={open} onClose={onClose}>
      <div className="space-y-3 px-1 pb-3">
        <div role="radiogroup" aria-label="Descanso deste exercício" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
          {MODES.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
              className={`min-h-11 rounded-lg text-sm font-semibold ${mode === id ? 'bg-primary text-white' : 'text-muted'}`}>{label}</button>
          ))}
        </div>
        {mode === 'own'
          ? <DurationWheel label="Descanso deste exercício" seconds={own} min={5} max={600} onChange={setOwn} />
          : <p className="text-sm text-muted">{mode === 'default' ? `O descanso padrão do app (${formatClock(fallback)}), de Perfil → Treino.` : 'Sem cronômetro depois das séries deste exercício.'}</p>}
        {toPlan && (
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={savePlan} onChange={e => setSavePlan(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
            <span className="text-sm font-semibold">Guardar no plano, para os próximos treinos</span>
          </label>
        )}
        <button type="button" onClick={() => { onSave(value, !!toPlan && savePlan); onClose(); }}
          className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Salvar: {restLabel(value, fallback)}</button>
      </div>
    </Sheet>
  );
}
