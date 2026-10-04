import { useRef, useState } from 'react';
import { updateSettings } from '../../domain/actions';
import { buildBackup, readBackup } from '../../domain/backup';
import { toDateKey } from '../../domain/dates';
import type { AppData, Settings } from '../../domain/model';
import { restoreBackup } from '../../domain/profile-view';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { plural } from '../../ui/format';
import { Card, INPUT } from './ProfileScreen';

/** Configurações agrupadas (O19): treino, dados e backup, conta, sobre. */
export function SettingsSection() {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  if (!settings) return null;
  const set = (patch: Partial<Settings>) => run((d, t) => updateSettings(d, patch, t));
  const toggle = (k: 'restAutoStart' | 'restSound' | 'restVibrate', label: string) =>
    <Toggle label={label} checked={settings[k]} onChange={v => set({ [k]: v })} />;

  return (
    <>
      <Card title="Treino">
        <label className="block text-sm font-semibold text-muted">Descanso padrão (segundos)
          <NumberField label="Descanso padrão em segundos" value={settings.restSeconds} onChange={n => { if (n >= 15) set({ restSeconds: n }); }} className="mt-1" />
        </label>
        {toggle('restAutoStart', 'Iniciar o descanso ao marcar a série')}
        {toggle('restSound', 'Som no fim do descanso')}
        {toggle('restVibrate', 'Vibrar no fim do descanso')}
        <Toggle label="Manter a tela ligada no treino" checked={settings.keepScreenOn ?? true} onChange={v => set({ keepScreenOn: v })} />
        <Toggle label="Mostrar ilustrações dos exercícios" checked={settings.showIllustrations ?? true} onChange={v => set({ showIllustrations: v })} />
      </Card>
      <BackupCard />
      <Card title="Conta e nuvem">
        <p className="text-sm text-muted">Seus dados ficam guardados neste aparelho. Em breve: entrar com o Google para guardar uma cópia na nuvem e usar em mais de um aparelho.</p>
      </Card>
      <Card title="Sobre">
        <p className="text-sm text-muted">Versão {__APP_VERSION__}. Ilustrações dos exercícios: Everkinetic (CC BY-SA 4.0).</p>
      </Card>
    </>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3">
      <span className="font-semibold">{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} className="size-6 shrink-0 accent-[var(--color-primary)]" />
    </label>
  );
}

function BackupCard() {
  const run = useAppStore(s => s.run);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ text: string; needsPassword: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const exportNow = () => {
    const data = useAppStore.getState().data;
    if (!data) return;
    const blob = new Blob([JSON.stringify(buildBackup(data, __APP_VERSION__))], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `treino-backup-${toDateKey(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage('Backup gerado.');
  };

  const tryRead = async (text: string, pass?: string) => {
    const result = await readBackup(text, pass);
    if (result.kind === 'needs-password') { setPending({ text, needsPassword: true }); setMessage(pass ? 'Senha incorreta.' : 'Este backup tem senha.'); return; }
    if (result.kind === 'invalid') { setPending(null); setMessage(result.reason); return; }
    const d: AppData = result.data;
    const summary = `${plural(d.workouts.length, 'treino', 'treinos')}, ${plural(Object.keys(d.plans).length, 'plano', 'planos')}`;
    setPending(null); setPassword('');
    if (!confirm(`Restaurar este backup (${summary})? Os dados atuais deste aparelho serão substituídos.`)) { setMessage('Restauração cancelada.'); return; }
    run((cur, now) => restoreBackup(cur, d, now));
    setMessage(`Backup restaurado: ${summary}.`);
  };

  return (
    <Card title="Dados e backup">
      <p className="text-sm text-muted">Guarde um arquivo com tudo (treinos, planos, peso) fora do aparelho. Aceita backups do app atual.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={exportNow} className="h-12 rounded-xl bg-primary font-bold text-white">Fazer backup</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="h-12 rounded-xl bg-surface-2 font-bold">Restaurar</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Arquivo de backup"
        onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await tryRead(await f.text()); }} />
      {pending?.needsPassword && (
        <form onSubmit={e => { e.preventDefault(); void tryRead(pending.text, password); }} className="flex gap-2">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} aria-label="Senha do backup" placeholder="Senha do backup" className={`${INPUT} mt-0`} />
          <button type="submit" className="h-12 shrink-0 rounded-xl bg-surface-2 px-4 font-bold">Abrir</button>
        </form>
      )}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </Card>
  );
}
