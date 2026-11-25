import { ALL_PLATES, BAR_KINDS, barKg, barKindFor, DEFAULT_PLATES, PLATE_PRESETS, plateLoad, setBarKg, setExerciseBar } from '../../domain/plates';
import { updateSettings } from '../../domain/actions';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

// anilhas têm duas casas (1,25): formatNumber arredondaria para 1,3
const formatNumber = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const samePlates = (a: readonly number[], b: readonly number[]) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);

/** Calculadora de anilhas (M14) para a carga da próxima série; T7: cada exercício com a sua barra. */
export function PlateSheet({ open, onClose, weight, exercise }: { open: boolean; onClose: () => void; weight: number; exercise: string }) {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  if (!settings) return null;
  const kind = barKindFor(exercise, settings);
  const bar = barKg(kind, settings);
  const kindLabel = BAR_KINDS.find(b => b.id === kind)!.short;
  const plates = settings.plates ?? DEFAULT_PLATES;
  const load = plateLoad(weight, bar, plates);
  const togglePlate = (p: number) => {
    const next = plates.includes(p) ? plates.filter(x => x !== p) : [...plates, p].sort((a, b) => b - a);
    run((d, now) => updateSettings(d, { plates: next }, now));
  };

  return (
    <Sheet title="Anilhas na barra" open={open} onClose={onClose}>
      <div className="px-1 pb-2">
        <p className="text-sm text-muted">Carga {formatNumber(weight)} kg · barra {kindLabel} de {formatNumber(bar)} kg</p>
        <div role="status" className="mt-2 rounded-xl bg-surface-2 p-3">
          {load.kind === 'below-bar' && <p className="font-semibold text-warning">A carga é menor que a barra.</p>}
          {load.kind === 'empty' && <p className="font-semibold">Só a barra.</p>}
          {load.kind === 'plates' && (
            <>
              <p className="text-xs font-semibold text-muted">Em cada lado</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{load.perSide.map(formatNumber).join(' + ') || '—'}</p>
              {load.missing > 0 && <p className="mt-1 text-sm font-semibold text-warning">Faltam {formatNumber(load.missing)} kg por lado com estas anilhas.</p>}
            </>
          )}
        </div>

        {/* T7: a barra deste exercício (fica guardada para ele) e o peso de cada tipo */}
        <p className="mt-4 text-xs font-semibold text-muted">Barra de {exercise}</p>
        <div role="radiogroup" aria-label={`Barra de ${exercise}`} className="mt-1 grid grid-cols-2 gap-2">
          {BAR_KINDS.map(b => (
            <button key={b.id} type="button" role="radio" aria-checked={kind === b.id}
              onClick={() => run((d, now) => updateSettings(d, setExerciseBar(d.settings, exercise, b.id), now))}
              className={`h-11 rounded-xl px-3 text-sm font-bold ${kind === b.id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>
              {b.label} · {formatNumber(barKg(b.id, settings))} kg
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-semibold text-muted">Peso da barra {kindLabel} (kg)
          <NumberField label={`Peso da barra ${kindLabel} em kg`} decimal value={bar}
            onChange={n => run((d, now) => updateSettings(d, setBarKg(d.settings, kind, n), now))} className="mt-1" />
        </label>

        <p className="mt-4 text-xs font-semibold text-muted">Anilhas que a academia tem</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {PLATE_PRESETS.map(p => (
            <button key={p.label} type="button" aria-pressed={samePlates(plates, p.plates)}
              onClick={() => run((d, now) => updateSettings(d, { plates: [...p.plates] }, now))}
              className={`h-9 rounded-full px-3 text-sm font-semibold ${samePlates(plates, p.plates) ? 'bg-primary/15 text-info' : 'bg-surface-2 text-muted'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_PLATES.map(p => (
            <button key={p} type="button" aria-pressed={plates.includes(p)} onClick={() => togglePlate(p)}
              className={`h-11 min-w-14 rounded-xl px-3 font-bold tabular-nums ${plates.includes(p) ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>
              {formatNumber(p)}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
