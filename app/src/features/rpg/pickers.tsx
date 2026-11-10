// Seletores do modo RPG: tema dos nomes, sexo do personagem, amostras de cor e opções em pílulas.
import { THEME_ABOUT, THEME_LABEL, type RpgTheme } from '../../data/rpg-classes';
import type { Swatch } from '../../data/rpg-looks';
import type { RpgSex } from '../../domain/rpg';

export function ThemePicker({ value, onChange }: { value: RpgTheme; onChange: (t: RpgTheme) => void }) {
  return (
    <div role="radiogroup" aria-label="Tema dos nomes das classes" className="mt-3 grid grid-cols-2 gap-2">
      {(['classico', 'maromba'] as const).map(t => {
        const on = value === t;
        return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => onChange(t)}
            className={`rounded-xl p-3 text-left ${on ? 'bg-surface-2 ring-2 ring-[var(--color-ink)]' : 'bg-surface-2 text-muted'}`}>
            <span className="block font-bold text-ink">{THEME_LABEL[t]}</span>
            <span className="block text-xs">{THEME_ABOUT[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SexPicker({ value, onChange }: { value: RpgSex; onChange: (s: RpgSex) => void }) {
  return (
    <div role="radiogroup" aria-label="Personagem" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
      {([['m', 'Masculino'], ['f', 'Feminino']] as const).map(([id, label]) => {
        const on = value === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)}
            className={`min-h-11 rounded-lg text-sm font-semibold ${on ? 'bg-primary text-white' : 'text-muted'}`}>Personagem {label.toLowerCase()}</button>
        );
      })}
    </div>
  );
}

/** Amostras de cor redondas (pele, cabelo, olhos). */
export function SwatchPicker({ label, options, value, onChange }: { label: string; options: readonly Swatch[]; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-1 flex flex-wrap gap-2">
        {options.map(o => {
          const on = o.id === value;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} aria-label={o.label} title={o.label} onClick={() => onChange(o.id)}
              className={`size-11 rounded-full border border-line ${on ? 'ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-surface)]' : ''}`}
              style={{ background: o.hex }} />
          );
        })}
      </div>
    </div>
  );
}

/** Opções em pílulas; `none` acrescenta a opção "Nenhum(a)". */
export function ChipPicker({ label, options, value, onChange, none }: {
  label: string; options: readonly { id: string; label: string }[]; value: string | undefined; onChange: (id: string | undefined) => void; none?: string;
}) {
  const all = none ? [{ id: '', label: none }, ...options] : options;
  return (
    <div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-1 flex flex-wrap gap-2">
        {all.map(o => {
          const on = (value ?? '') === o.id;
          return (
            <button key={o.id || 'nenhum'} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id || undefined)}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-ink'}`}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}
