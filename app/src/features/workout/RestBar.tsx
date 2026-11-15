import { useEffect } from 'react';
import { useNow } from '../../hooks/use-now';
import { useAppStore } from '../../store';
import { formatClock } from '../../ui/format';
import { restAlert, useRestStore } from './rest-store';
import { restAlarm } from './rest-alarm-instance';
import { ProgressRing } from '../../ui/ProgressRing';

/** Descanso em uma linha acima da barra inferior (O18): não toma 1/4 da tela. */
export function RestBar() {
  const endsAt = useRestStore(s => s.endsAt);
  const total = useRestStore(s => s.total);
  const add = useRestStore(s => s.add);
  const finish = useRestStore(s => s.finish);
  const pausedLeft = useRestStore(s => s.pausedLeft);
  const now = useNow(250, endsAt !== null);
  const remaining = endsAt === null ? 0 : Math.ceil((endsAt - now) / 1000);

  useEffect(() => {
    if (endsAt === null || remaining > 0) return;
    const settings = useAppStore.getState().data?.settings;
    // com o alarme do Android agendado na hora certa, ele já toca: a página só vibra
    const native = restAlarm.handledNatively(endsAt);
    restAlert({ sound: !native && (settings?.restSound ?? true), vibrate: settings?.restVibrate ?? true });
    finish();
  }, [endsAt, remaining, finish]);

  if (endsAt === null && pausedLeft !== null) {
    return (
      <div role="timer" aria-label="Descanso pausado" className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
        <div className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-2 shadow-xl">
          <p className="flex-1 text-sm font-semibold text-muted">Descanso pausado · {formatClock(Math.ceil(pausedLeft / 1000))}</p>
        </div>
      </div>
    );
  }
  if (endsAt === null) return null;
  const pct = total ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;
  return (
    <div role="timer" aria-label="Descanso" className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
      <div className="mx-auto flex max-w-xl items-center gap-2 overflow-hidden rounded-2xl border border-line bg-surface-2 py-1.5 pl-2 pr-1 shadow-xl">
        {/* anel que esvazia: dá para ver de longe quanto falta */}
        <ProgressRing fraction={pct / 100} label={formatClock(remaining)} size={60} tone={remaining <= 3 ? 'warning' : 'primary'} />
        <p className="min-w-0 flex-1 text-sm font-semibold text-muted">Descanso</p>
        <button type="button" onClick={() => add(-15)} className="h-11 rounded-xl px-3 font-bold text-muted">−15</button>
        <button type="button" onClick={() => add(15)} className="h-11 rounded-xl px-3 font-bold text-muted">+15</button>
        <button type="button" onClick={finish} className="h-11 rounded-xl bg-page px-4 font-bold">Pular</button>
      </div>
    </div>
  );
}
