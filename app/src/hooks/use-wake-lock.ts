import { useEffect } from 'react';

interface WakeLockSentinelLike { release(): Promise<void>; released: boolean }
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };

/**
 * Mantém a tela ligada enquanto `active` (M2). O sistema solta a trava quando o app sai da tela,
 * então ela é pedida de novo ao voltar. Sem suporte, não faz nada.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!active || !nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      nav.wakeLock!.request('screen').then(s => {
        if (cancelled) void s.release();
        else sentinel = s;
      }, () => { /* recusado (economia de bateria): segue sem */ });
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}
