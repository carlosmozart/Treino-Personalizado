import { useEffect, useState } from 'react';
import { ensureNotificationPermission, exactAlarmAllowed, notificationsAvailable } from '../../platform/notifications';

/** Situação das permissões do aviso de descanso no Android, com atalhos para liberar. */
export function AlarmSettings() {
  const [state, setState] = useState<{ notify: boolean; exact: boolean } | null>(null);
  const refresh = async () => setState({ notify: await ensureNotificationPermission(false), exact: await exactAlarmAllowed(false) });
  useEffect(() => { if (notificationsAvailable()) void refresh(); }, []);
  if (!notificationsAvailable() || !state) return null;
  if (state.notify && state.exact) return <p className="text-sm text-success">Aviso do descanso pelo alarme do Android: ativo, inclusive com a tela bloqueada.</p>;
  return (
    <div className="space-y-2 rounded-xl bg-surface-2 p-3">
      <p className="text-sm">Para o aviso do descanso tocar pelo alarme do Android (com a tela bloqueada e no volume de alarmes):</p>
      {!state.notify && (
        <button type="button" onClick={() => void ensureNotificationPermission(true).then(refresh)} className="h-11 w-full rounded-xl bg-primary font-bold text-white">
          Permitir notificações
        </button>
      )}
      {!state.exact && (
        <button type="button" onClick={() => void exactAlarmAllowed(true).then(refresh)} className="h-11 w-full rounded-xl bg-page font-bold">
          Permitir alarme no horário exato
        </button>
      )}
    </div>
  );
}
