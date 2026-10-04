import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { rewardToast, type Toast } from './reward-messages';

const SHOW_MS = 3500;

/** Mostra os eventos de recompensa um por vez, acima da barra inferior (O24: longe do título). */
export function Toaster() {
  const pending = useAppStore(s => s.events.length);
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => {
    if (!pending) return;
    const toasts = useAppStore.getState().takeEvents().map(rewardToast).filter((t): t is Toast => t !== null);
    if (toasts.length) setQueue(q => [...q, ...toasts]);
  }, [pending]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setQueue(q => q.slice(1)), SHOW_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
      {current && (
        <button type="button" onClick={() => setQueue(q => q.slice(1))}
          className={`pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-xl ${
            current.tone === 'trophy' ? 'border-warning/50 bg-surface-2 text-ink' : 'border-line bg-surface-2 text-ink'}`}>
          {current.text}
        </button>
      )}
    </div>
  );
}
