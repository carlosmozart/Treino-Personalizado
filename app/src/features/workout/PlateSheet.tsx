import { ALL_PLATES, DEFAULT_BAR, DEFAULT_PLATES, plateLoad } from '../../domain/plates';
import { updateSettings } from '../../domain/actions';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

// anilhas têm duas casas (1,25): formatNumber arredondaria para 1,3
const formatNumber = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Calculadora de anilhas (M14) para a carga da próxima série. */
export function PlateSheet({ open, onClose, weight }: { open: boolean; onClose: () => void; weight: number }) {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  if (!settings) return null;
  const bar = settings.barWeight ?? DEFAULT_BAR;
  const plates = settings.plates ?? DEFAULT_PLATES;
  const load = plateLoad(weight, bar, plates);
  const togglePlate = (p: number) => {
    const next = plates.includes(p) ? plates.filter(x => x !== p) : [...plates, p].sort((a, b) => b - a);
    run((d, now) => updateSettings(d, { plates: next }, now));
  };

  return (
    <Sheet title="Anilhas na barra" open={open} onClose={onClose}>
      <div className="px-1 pb-2">
        <p className="text-sm text-muted">Carga {formatNumber(weight)} kg · barra {formatNumber(bar)} kg</p>
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
        <label className="mt-4 block text-xs font-semibold text-muted">Peso da barra (kg)
          <NumberField label="Peso da barra em kg" decimal value={bar} onChange={n => run((d, now) => updateSettings(d, { barWeight: Math.min(50, Math.max(0, n)) }, now))} className="mt-1" />
        </label>
        <p className="mt-4 text-xs font-semibold text-muted">Anilhas que a academia tem</p>
        <div className="mt-1 flex flex-wrap gap-2">
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
