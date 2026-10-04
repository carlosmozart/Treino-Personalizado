import { useEffect } from 'react';
import { useNow } from '../../hooks/use-now';
import { useAppStore } from '../../store';
import { formatClock } from '../../ui/format';
import { restAlert, useRestStore } from './rest-store';
import { restAlarm } from './rest-alarm-instance';

/** Descanso em uma linha acima da barra inferior (O18): não toma 1/4 da tela. */
export function RestBar() {
  const endsAt = useRestStore(s => s.endsAt);
  const total = useRestStore(s => s.total);
  const add = useRestStore(s => s.add);
  const stop = useRestStore(s => s.stop);
  const now = useNow(250, endsAt !== null);
  const remaining = endsAt === null ? 0 : Math.ceil((endsAt - now) / 1000);

  useEffect(() => {
    if (endsAt === null || remaining > 0) return;
    const settings = useAppStore.getState().data?.settings;
    // com o alarme do Android agendado na hora certa, ele já toca: a página só vibra
    const native = restAlarm.handledNatively(endsAt);
    restAlert({ sound: !native && (settings?.restSound ?? true), vibrate: settings?.restVibrate ?? true });
    stop();
  }, [endsAt, remaining, stop]);

  if (endsAt === null) return null;
  const pct = total ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;
  return (
    <div role="timer" aria-label="Descanso" className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
      <div className="mx-auto flex max-w-xl items-center gap-2 overflow-hidden rounded-2xl border border-line bg-surface-2 pl-4 pr-1 shadow-xl">
        <div className="relative flex-1 py-2">
          <p className="text-xs font-semibold text-muted">Descanso</p>
          <p className="text-2xl font-black tabular-nums">{formatClock(remaining)}</p>
          <div className="absolute inset-x-0 bottom-0 h-1 rounded bg-page">
            <div className="h-1 rounded bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => add(-15)} className="h-11 rounded-xl px-3 font-bold text-muted">−15</button>
        <button type="button" onClick={() => add(15)} className="h-11 rounded-xl px-3 font-bold text-muted">+15</button>
        <button type="button" onClick={stop} className="h-11 rounded-xl bg-page px-4 font-bold">Pular</button>
      </div>
    </div>
  );
}
