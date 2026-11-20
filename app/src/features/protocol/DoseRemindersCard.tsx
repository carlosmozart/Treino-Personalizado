// Z4: ligar os lembretes de dose e escolher se o aviso mostra o nome e a dose.
import { useState } from 'react';
import { updateSettings } from '../../domain/actions';
import type { Protocol } from '../../domain/model';
import { DISCREET_BODY } from '../../domain/protocol-reminders';
import { doseTime, timesOf } from '../../domain/protocol';
import { ensureNotificationPermission, notificationsAvailable } from '../../platform/notifications';
import { useAppStore } from '../../store';
import { resyncDoseReminders } from './dose-reminders-start';

export function DoseRemindersCard({ protocols }: { protocols: Protocol[] }) {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  const [denied, setDenied] = useState(false);
  if (!settings) return null;
  const on = !!settings.doseReminders;
  const withTime = protocols.some(p => p.items.some(i => Array.from({ length: timesOf(i) }, (_, k) => doseTime(i, k)).some(Boolean)));
  const native = notificationsAvailable();
  const toggle = async (value: boolean) => {
    if (value && native) {
      const ok = await ensureNotificationPermission(true);
      setDenied(!ok);
      if (!ok) return;
    }
    run((d, t) => updateSettings(d, { doseReminders: value }, t));
    resyncDoseReminders();
  };
  return (
    <section aria-label="Lembretes de dose" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Lembretes de dose</h2>
      {!native ? (
        <p className="mt-1 text-sm text-muted">Os lembretes tocam no app do celular (APK). No navegador não dá para avisar com o app fechado.</p>
      ) : (
        <>
          <label className="mt-1 flex min-h-12 items-center justify-between gap-3">
            <span className="font-semibold">Avisar na hora de cada dose</span>
            <input type="checkbox" role="switch" checked={on} onChange={e => void toggle(e.target.checked)} className="size-6 shrink-0 accent-[var(--color-primary)]" />
          </label>
          {on && (
            <label className="flex min-h-12 items-center justify-between gap-3">
              <span>
                <span className="block font-semibold">Mostrar o nome e a dose no aviso</span>
                <span className="block text-sm text-muted">Desligado, o aviso diz só "{DISCREET_BODY}"</span>
              </span>
              <input type="checkbox" role="switch" checked={!!settings.doseReminderDetails}
                onChange={e => { run((d, t) => updateSettings(d, { doseReminderDetails: e.target.checked }, t)); }} className="size-6 shrink-0 accent-[var(--color-primary)]" />
            </label>
          )}
          {denied && <p className="mt-1 text-sm text-warning">Sem permissão de notificação. Libere nas configurações do Android para o app avisar.</p>}
        </>
      )}
      {!withTime && <p className="mt-1 text-sm text-muted">Só avisa as doses com horário: coloque o horário em Editar protocolo.</p>}
      {native && on && <p className="mt-1 text-xs text-faint">Avisa os próximos 7 dias e para de avisar a dose que já foi registrada. Com o intervalo dos exames escolhido (cartão Exames), também avisa no dia de refazer. Na tela bloqueada o aviso fica escondido.</p>}
    </section>
  );
}
