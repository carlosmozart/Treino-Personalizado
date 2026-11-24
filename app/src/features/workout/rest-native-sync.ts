// M21: acerta o cronômetro da tela com o que os botões do aviso do descanso mudaram no Android
// (−15s, +15s, Pular). Confere ao abrir o app, ao voltar a ele e na hora, se ele estiver aberto.
import { reconcileRest, restTimerPlugin, type NativeRest } from '../../platform/rest-timer';
import { useErrorLog } from '../../platform/error-log';
import { useAppStore } from '../../store';
import { useRestStore } from './rest-store';
import './rest-alarm-instance';

let lastSeq: number | null = null;

export function applyNativeRest(native: NativeRest, now = Date.now()): void {
  const rest = useRestStore.getState();
  const fix = reconcileRest(rest, native, lastSeq, now, useAppStore.getState().session !== null);
  lastSeq = native.seq;
  if (fix.kind === 'set') useRestStore.setState({ endsAt: fix.endsAt, total: fix.total });
  else if (fix.kind === 'end') rest.finish();
  else if (fix.kind === 'adopt') useRestStore.setState({ endsAt: fix.endsAt, total: fix.total, source: null, pausedLeft: null });
  else if (fix.kind === 'hide') void restTimerPlugin()?.hide().catch(() => undefined);
}

/** Só para os testes. */
export function resetNativeRestSeq(): void { lastSeq = null; }

export function startRestNativeSync(): void {
  const plugin = restTimerPlugin();
  if (!plugin) return;
  const report = (e: unknown) => useErrorLog.getState().report(e, 'Descanso na notificação');
  const check = () => { plugin.getState().then(s => applyNativeRest(s), report); };
  // o addListener do Capacitor devolve um "thenable" sem .catch (3.36.0 quebrava aqui): Promise.resolve embrulha
  Promise.resolve().then(() => plugin.addListener('restChanged', s => applyNativeRest(s))).catch(report);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  check();
}
