// V17: cronômetro da prancha e das isometrias (exercício por tempo). 3, 2, 1 e conta o tempo da
// série; no fim, marca a série com o tempo planejado e começa o descanso. Quando o descanso de
// uma série por tempo acaba, a próxima começa sozinha (Perfil → Treino desliga).
import { useEffect } from 'react';
import { create } from 'zustand';
import { afterSet, restAfterSet, toggleSet, updateSet, type ActiveSession } from '../../domain/session';
import { useNow } from '../../hooks/use-now';
import { useAppStore } from '../../store';
import { formatClock } from '../../ui/format';
import { restAlert, useRestStore } from './rest-store';
import { ProgressRing } from '../../ui/ProgressRing';

export const COUNTDOWN_SECONDS = 3;

interface HoldState {
  hold: { ex: number; set: number; seconds: number; phase: 'countdown' | 'hold'; endsAt: number; holdStart: number } | null;
  start(ex: number, set: number, seconds: number, now?: number): void;
  stop(): void;
}

export const useHoldStore = create<HoldState>(set => ({
  hold: null,
  start: (ex, setIndex, seconds, now = Date.now()) =>
    set({ hold: { ex, set: setIndex, seconds: Math.max(1, Math.round(seconds)), phase: 'countdown', endsAt: now + COUNTDOWN_SECONDS * 1000, holdStart: 0 } }),
  stop: () => set({ hold: null })
}));

/** A próxima série por tempo ainda não feita do exercício (ou null). */
export function nextHoldSet(s: ActiveSession, ex: number): number | null {
  const e = s.exercises[ex];
  if (!e || e.mode !== 'time') return null;
  const i = e.sets.findIndex(x => !x.done);
  return i < 0 ? null : i;
}

/** Começa a série por tempo `set` do exercício `ex` (com 3, 2, 1). */
export function startHold(s: ActiveSession, ex: number, set: number): void {
  const e = s.exercises[ex];
  if (!e || e.mode !== 'time' || !e.sets[set]) return;
  useRestStore.getState().stop();
  useHoldStore.getState().start(ex, set, e.sets[set]!.reps || e.seconds || 30);
}

/** A barra do cronômetro, acima da barra de abas (no lugar da do descanso). */
export function HoldBar({ session }: { session: ActiveSession }) {
  const hold = useHoldStore(s => s.hold);
  const stop = useHoldStore(s => s.stop);
  const update = useAppStore(s => s.updateSession);
  const settings = useAppStore(s => s.data?.settings);
  const now = useNow(200, !!hold);

  const finish = (seconds: number) => {
    if (!hold) return;
    const { ex, set } = hold;
    stop();
    update(s => {
      const target = s.exercises[ex]?.sets[set];
      if (!target || target.done) return s;
      return toggleSet(updateSet(s, ex, set, { reps: seconds }), ex, set, new Date());
    });
    if (settings) restAlert({ sound: settings.restSound, vibrate: settings.restVibrate });
    // o descanso depois da série, como ao marcar à mão (num superset, não descansa no meio da rodada)
    const e = session.exercises[ex];
    if (!e || !settings?.restAutoStart || !afterSet(session, ex).rest) return;
    const rest = restAfterSet(e, set, settings);
    if (rest > 0) useRestStore.getState().start(rest, undefined, ex);
  };

  useEffect(() => {
    if (!hold) return;
    if (hold.phase === 'countdown' && now >= hold.endsAt) {
      useHoldStore.setState({ hold: { ...hold, phase: 'hold', holdStart: hold.endsAt, endsAt: hold.endsAt + hold.seconds * 1000 } });
      if (settings?.restVibrate && typeof navigator.vibrate === 'function') navigator.vibrate(150);
    } else if (hold.phase === 'hold' && now >= hold.endsAt) {
      finish(hold.seconds);
    }
  }, [now, hold]);

  if (!hold) return null;
  const e = session.exercises[hold.ex];
  if (!e) return null;
  const counting = hold.phase === 'countdown';
  const left = Math.max(0, Math.ceil((hold.endsAt - now) / 1000));
  const elapsed = counting ? 0 : Math.max(0, Math.round((now - hold.holdStart) / 1000));
  return (
    <div role="timer" aria-label={`Cronômetro de ${e.name}`} className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
      <div className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-primary bg-surface-2 py-1.5 pl-2 pr-1 shadow-xl">
        <ProgressRing size={60} tone={counting ? 'warning' : 'primary'}
          fraction={counting ? left / COUNTDOWN_SECONDS : left / hold.seconds}
          label={counting ? (left > 0 ? `${left}` : 'Já!') : formatClock(left)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted">{e.name} · série {hold.set + 1}</p>
          <p className="text-sm font-semibold" aria-live="polite">{counting ? (left > 0 ? `${left}…` : 'Já!') : `${formatClock(left)} para acabar`}</p>
        </div>
        {!counting && (
          <button type="button" onClick={() => finish(Math.max(1, elapsed))} className="h-11 rounded-xl bg-primary px-3 text-sm font-bold text-white">Terminar ({elapsed} s)</button>
        )}
        <button type="button" onClick={stop} className="h-11 rounded-xl bg-page px-3 text-sm font-bold">Cancelar</button>
      </div>
    </div>
  );
}
