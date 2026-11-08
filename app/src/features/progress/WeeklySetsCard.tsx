// V3: séries da semana por grupo contra a faixa-alvo, com o ajuste das faixas e a linha do Início.
import { useState } from 'react';
import { updateSettings } from '../../domain/actions';
import { mostRoom, targetFor, TARGET_GROUPS, weeklySets, withTarget, type GroupWeek } from '../../domain/weekly-sets';
import { useNow } from '../../hooks/use-now';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';

const STATUS_TONE: Record<GroupWeek['status'], string> = { falta: 'bg-primary/60', 'na faixa': 'bg-success', acima: 'bg-info' };
const STATUS_TEXT: Record<GroupWeek['status'], string> = { falta: 'text-muted', 'na faixa': 'text-success', acima: 'text-info' };

/** Uma linha: nome, "14 / 10–20" e a barra com a faixa marcada. */
function Row({ g }: { g: GroupWeek }) {
  const scale = Math.max(g.target.max * 1.25, g.sets, 1);
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  const label = g.status === 'falta' ? `faltam ${g.missing}` : g.status;
  return (
    <li aria-label={`${g.group}: ${g.sets} séries, faixa de ${g.target.min} a ${g.target.max}, ${label}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{g.group}</span>
        <span className="tabular-nums"><span className="font-bold">{g.sets}</span><span className="text-muted"> / {g.target.min}–{g.target.max}</span>
          <span className={`ml-2 text-xs font-semibold ${STATUS_TEXT[g.status]}`}>{label}</span></span>
      </div>
      <div aria-hidden="true" className="relative mt-1 h-2.5 rounded-full bg-surface-2">
        <span className="absolute inset-y-0 rounded-full bg-success/20" style={{ left: pct(g.target.min), width: `calc(${pct(g.target.max)} - ${pct(g.target.min)})` }} />
        <span className={`absolute inset-y-0 left-0 rounded-full ${STATUS_TONE[g.status]}`} style={{ width: pct(g.sets) }} />
      </div>
    </li>
  );
}

export function WeeklySetsCard() {
  const data = useAppStore(s => s.data);
  const now = new Date(useNow(60_000));
  const [editing, setEditing] = useState(false);
  if (!data) return null;
  const weeks = weeklySets(data, now);
  return (
    <section aria-label="Séries da semana" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">Séries da semana</h2>
          <p className="text-sm text-muted">Séries de trabalho por grupo, contra a faixa que costuma fazer crescer.</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="h-10 shrink-0 rounded-xl bg-surface-2 px-3 text-sm font-semibold">Faixas</button>
      </div>
      <ul className="mt-3 space-y-2.5">{weeks.map(g => <Row key={g.group} g={g} />)}</ul>
      <TargetsSheet open={editing} onClose={() => setEditing(false)} />
    </section>
  );
}

/** Ajuste das faixas por grupo e a linha opcional do Início. */
function TargetsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  if (!settings) return null;
  const set = (group: string, side: 'min' | 'max', n: number) => {
    const cur = targetFor(settings, group);
    run((d, now) => updateSettings(d, { weeklySetTargets: withTarget(d.settings, group, { ...cur, [side]: n }) }, now));
  };
  return (
    <Sheet title="Faixas de séries por semana" open={open} onClose={onClose}>
      <div className="space-y-2 px-1 pb-3">
        <p className="text-sm text-muted">Mínimo e máximo de séries de trabalho por semana para cada grupo. O padrão vem do que a pesquisa de hipertrofia costuma indicar; ajuste ao seu objetivo.</p>
        {TARGET_GROUPS.map(g => {
          const t = targetFor(settings, g);
          return (
            <div key={g} className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2">
              <span className="text-sm font-semibold">{g}</span>
              <NumberField label={`Mínimo de ${g}`} value={t.min} onChange={n => set(g, 'min', n)} />
              <NumberField label={`Máximo de ${g}`} value={t.max} onChange={n => set(g, 'max', n)} />
            </div>
          );
        })}
        <button type="button" disabled={!settings.weeklySetTargets || !Object.keys(settings.weeklySetTargets).length}
          onClick={() => run((d, now) => updateSettings(d, { weeklySetTargets: {} }, now))}
          className="h-11 w-full rounded-xl bg-surface-2 text-sm font-semibold disabled:opacity-40">Voltar às faixas padrão</button>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span className="font-semibold">Mostrar no Início o grupo com mais espaço na semana</span>
          <input type="checkbox" role="switch" checked={settings.weeklySetsOnHome ?? false}
            onChange={e => run((d, now) => updateSettings(d, { weeklySetsOnHome: e.target.checked }, now))} className="size-6 shrink-0 accent-[var(--color-primary)]" />
        </label>
      </div>
    </Sheet>
  );
}

/** Linha do Início (opcional): "Esta semana, mais espaço em Costas: 4 de 10–20 séries." */
export function WeeklySetsHomeLine() {
  const data = useAppStore(s => s.data);
  const setTab = useUiStore(s => s.setTab);
  if (!data?.settings.weeklySetsOnHome) return null;
  const room = mostRoom(weeklySets(data, new Date()));
  return (
    <button type="button" onClick={() => setTab('progresso')} className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm">
      {room
        ? <>Esta semana, mais espaço em <strong>{room.group}</strong>: {room.sets} de {room.target.min}–{room.target.max} séries.</>
        : <>Todos os grupos já chegaram ao mínimo da semana. 💪</>}
    </button>
  );
}
