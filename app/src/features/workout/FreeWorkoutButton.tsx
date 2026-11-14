import { useState } from 'react';
import { MUSCLE_GROUPS } from '../../data/exercise-library';
import { BUILD_MINUTES, buildDay, startBuiltSession, yesterdayGroups, type BuildMinutes } from '../../domain/day-builder';
import { toDateKey } from '../../domain/dates';
import { startFreeSession } from '../../domain/session';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { askRestAlarmPermission } from './rest-alarm-instance';

/** Treino livre: começa vazio, sem plano; os exercícios entram por "Adicionar exercício". */
export function FreeWorkoutButton() {
  const open = useAppStore(s => s.openSession);
  const [building, setBuilding] = useState(false);
  return (
    <div className="space-y-3">
      {/* W7: o treino de hoje montado pelos grupos e pelo tempo */}
      <button type="button" onClick={() => setBuilding(true)}
        className="h-12 w-full rounded-xl bg-surface-2 font-semibold">
        Montar o treino de hoje pelos grupos
      </button>
      <button type="button" onClick={() => { askRestAlarmPermission(); open(startFreeSession(new Date(), crypto.randomUUID())); }}
        className="h-12 w-full rounded-xl border border-dashed border-line font-semibold text-muted">
        Treino livre, sem seguir o plano
      </button>
      <BuildDaySheet open={building} onClose={() => setBuilding(false)} />
    </div>
  );
}

const GROUPS = MUSCLE_GROUPS.filter(g => g !== 'Cardio');

/** W7: escolher grupos e tempo; o app escolhe os exercícios (equipamento, favoritos, os mais feitos). */
function BuildDaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const openSession = useAppStore(s => s.openSession);
  const [groups, setGroups] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<BuildMinutes>(40);
  if (!data) return null;
  const names = buildDay(data, groups, minutes);
  const yesterday = yesterdayGroups(data, toDateKey(new Date())).filter(g => groups.includes(g));
  const close = () => { setGroups([]); onClose(); };
  const start = () => {
    askRestAlarmPermission();
    if (openSession(startBuiltSession(data, groups, names, new Date(), crypto.randomUUID()))) close();
  };
  return (
    <Sheet title="Montar o treino de hoje" open={open} onClose={close}>
      <div className="space-y-4 px-1 pb-3">
        <div>
          <p className="text-sm font-semibold text-muted">O que você quer treinar?</p>
          <div role="group" aria-label="Grupos" className="mt-1 flex flex-wrap gap-1.5">
            {GROUPS.map(g => {
              const on = groups.includes(g);
              return (
                <button key={g} type="button" aria-pressed={on} onClick={() => setGroups(v => (on ? v.filter(x => x !== g) : [...v, g]))}
                  className={`h-10 rounded-full border px-3 text-sm font-semibold ${on ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted'}`}>{g}</button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted">Quanto tempo?</p>
          <div role="radiogroup" aria-label="Tempo" className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {BUILD_MINUTES.map(m => (
              <button key={m} type="button" role="radio" aria-checked={minutes === m} onClick={() => setMinutes(m)}
                className={`min-h-11 rounded-lg text-sm font-semibold ${minutes === m ? 'bg-primary text-white' : 'text-muted'}`}>{m} min</button>
            ))}
          </div>
        </div>
        {yesterday.length > 0 && <p className="text-sm text-warning">Você treinou {yesterday.join(', ')} ontem; o músculo pode ainda estar se recuperando.</p>}
        {names.length > 0 ? (
          <div className="rounded-xl bg-surface-2 p-3" data-testid="treino-montado">
            <p className="text-sm font-semibold">{names.length} exercícios, com a carga da última vez:</p>
            <ol className="mt-1 list-decimal pl-5 text-sm">{names.map(n => <li key={n}>{n}</li>)}</ol>
            <p className="mt-1 text-xs text-muted">Com o seu equipamento (Perfil → Treino), os favoritos e os que você mais faz primeiro. Dá para trocar ou tirar no treino.</p>
          </div>
        ) : <p className="text-sm text-muted">Escolha pelo menos um grupo.</p>}
        <button type="button" disabled={!names.length} onClick={start} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">Começar este treino</button>
      </div>
    </Sheet>
  );
}
