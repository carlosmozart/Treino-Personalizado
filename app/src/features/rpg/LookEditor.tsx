// Criador de personagem (R2): sexo, pele, cabelo, olhos, rosto, barba e detalhes, com o retrato ao
// vivo. Dá para ver o personagem com a roupa de qualquer classe da árvore.
import { useState } from 'react';
import { RPG_CLASSES, RPG_CLASS_BY_ID } from '../../data/rpg-classes';
import { BEARDS, EYE_COLORS, FACES, HAIR_COLORS, HAIR_STYLES, MARKS, SKIN_TONES, type RpgLook } from '../../data/rpg-looks';
import { className, setRpgLook, setRpgSex, type RpgView } from '../../domain/rpg';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { Portrait } from './Portrait';
import { ChipPicker, SexPicker, SwatchPicker } from './pickers';

export function LookEditor({ open, onClose, view }: { open: boolean; onClose: () => void; view: RpgView }) {
  const run = useAppStore(s => s.run);
  const [preview, setPreview] = useState<string | null>(null);
  const { look, sex, theme } = view;
  const cls = RPG_CLASS_BY_ID[preview ?? view.current.cls.id] ?? view.current.cls;
  const set = (patch: Partial<RpgLook>) => run((d, n) => setRpgLook(d, { ...look, ...patch }, n));
  const styles = HAIR_STYLES.filter(h => !h.sexes || h.sexes.includes(sex));

  return (
    <Sheet title="Aparência do personagem" open={open} onClose={onClose}>
      <div className="space-y-4 pb-2">
        <div className="flex items-end justify-center gap-3 rounded-2xl bg-surface-2 py-3">
          <Portrait look={look} sex={sex} cls={cls} theme={theme} mode="full" size={130} label={`Prévia do personagem como ${className(cls, theme, sex)}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted">Ver com a roupa de</p>
          <div role="radiogroup" aria-label="Ver com a roupa de" className="mt-1 flex gap-2 overflow-x-auto pb-1">
            {RPG_CLASSES.map(c => {
              const on = c.id === cls.id;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setPreview(c.id === view.current.cls.id ? null : c.id)}
                  className={`min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-ink'}`}>
                  {className(c, theme, sex)}{c.id === view.current.cls.id ? ' (atual)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <SexPicker value={sex} onChange={x => run((d, n) => setRpgSex(d, x, n))} />
        <SwatchPicker label="Pele" options={SKIN_TONES} value={look.skin} onChange={skin => set({ skin })} />
        <ChipPicker label="Cabelo" options={styles} value={look.hair} onChange={hair => hair && set({ hair })} />
        <SwatchPicker label="Cor do cabelo" options={HAIR_COLORS} value={look.hairColor} onChange={hairColor => set({ hairColor })} />
        <SwatchPicker label="Olhos" options={EYE_COLORS} value={look.eyes} onChange={eyes => set({ eyes })} />
        <ChipPicker label="Rosto" options={FACES} value={look.face} onChange={face => face && set({ face })} />
        {sex === 'm' && <ChipPicker label="Barba" options={BEARDS} none="Sem barba" value={look.beard} onChange={beard => set({ beard })} />}
        <ChipPicker label="Marca" options={MARKS} none="Nenhuma" value={look.mark} onChange={mark => set({ mark })} />
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span className="font-semibold">Óculos</span>
          <input type="checkbox" role="switch" checked={!!look.glasses} onChange={e => set({ glasses: e.target.checked })}
            className="size-6 shrink-0 accent-[var(--color-primary)]" />
        </label>
        <p className="text-xs text-faint">A roupa muda sozinha com a classe. Arte: OpenWorld (CC0).</p>
        <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-primary font-bold text-white">Pronto</button>
      </div>
    </Sheet>
  );
}
