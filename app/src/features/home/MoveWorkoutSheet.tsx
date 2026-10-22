import { addDays, toDateKey, weekdayName, type DateKey } from '../../domain/dates';
import { moveTargets, moveWorkout } from '../../domain/reschedule';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';

/** "amanhã" ou "quarta-feira, 22": o dia para onde (ou de onde) o treino foi remarcado. */
export function moveDayLabel(date: DateKey, now = new Date()): string {
  const today = toDateKey(now);
  if (date === addDays(today, 1)) return 'amanhã';
  if (date === addDays(today, -1)) return 'ontem';
  return `${weekdayName(date)}, ${Number(date.slice(8, 10))}`;
}

const capitalize = (text: string) => text[0]!.toUpperCase() + text.slice(1);

const WHY = { treino: 'Já tem treino', nota: 'Dia anotado sem treino' } as const;

/** M19: leva o treino de hoje para outro dia, sem mudar o plano semanal. */
export function MoveWorkoutSheet({ open, title, onClose }: { open: boolean; title: string; onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;
  if (!data || !plan) return null;
  const today = toDateKey(new Date());
  const targets = moveTargets(data, plan, today);
  const move = (to: DateKey) => { run((d, now) => moveWorkout(d, today, to, now)); onClose(); };

  return (
    <Sheet title="Remarcar o treino" open={open} onClose={onClose}>
      <div className="px-1 pb-3">
        <p className="text-sm text-muted">
          “{title}” sai de hoje e vai para o dia que você escolher. O plano da semana não muda, hoje não quebra a sequência e o lembrete vai junto.
        </p>
        <ul className="mt-3 space-y-2">
          {targets.map(t => (
            <li key={t.date}>
              <button type="button" disabled={!t.free} onClick={() => move(t.date)}
                className="flex h-14 w-full items-center justify-between rounded-xl bg-surface-2 px-4 text-left disabled:opacity-50">
                <span className="font-semibold">{capitalize(moveDayLabel(t.date))}</span>
                <span className="text-sm text-muted">{t.free ? 'Livre' : WHY[t.why]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
