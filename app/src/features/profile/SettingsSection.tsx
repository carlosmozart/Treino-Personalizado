import { useRef, useState } from 'react';
import { updateMeta, updateSettings } from '../../domain/actions';
import { buildBackup, readBackup } from '../../domain/backup';
import { canAutoBackup, saveBackupFile } from '../../platform/backup-file';
import { errorReport, useErrorLog } from '../../platform/error-log';
import { toDateKey } from '../../domain/dates';
import type { AppData, Settings, ThemePref } from '../../domain/model';
import { restoreBackup } from '../../domain/profile-view';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { plural } from '../../ui/format';
import { Card, INPUT } from './ProfileScreen';
import { AlarmSettings } from './AlarmSettings';
import { UpdateControls } from './UpdateOffer';
import { WhatsNewButton } from './WhatsNew';
import { encryptBackup } from '../../domain/backup-crypto';
import { ensureNotificationPermission, notificationsAvailable } from '../../platform/notifications';
import { resyncReminders } from '../plan/reminders-sync';
import { parseTrainingTime } from '../../domain/reminders';

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
        <AlarmSettings />
        {notificationsAvailable() && <ReminderToggle on={!!settings.trainingReminders} set={set} />}
        <Toggle label="Progressão automática de carga" checked={settings.autoProgression ?? true} onChange={v => set({ autoProgression: v })} />
        <Toggle label="Botões de ajuste de carga no treino" checked={settings.weightButtons ?? true} onChange={v => set({ weightButtons: v })} />
        <Toggle label="Manter a tela ligada no treino" checked={settings.keepScreenOn ?? true} onChange={v => set({ keepScreenOn: v })} />
        <Toggle label="Mostrar ilustrações dos exercícios" checked={settings.showIllustrations ?? true} onChange={v => set({ showIllustrations: v })} />
      </Card>
      <Card title="Aparência">
        <ThemeChoice value={settings.theme ?? 'system'} onChange={v => set({ theme: v })} />
      </Card>
      <BackupCard />
      <Card title="Conta e nuvem">
        <p className="text-sm text-muted">Seus dados ficam guardados neste aparelho. Em breve: entrar com o Google para guardar uma cópia na nuvem e usar em mais de um aparelho.</p>
      </Card>
      <Card title="Sobre">
        <p className="text-sm text-muted">Versão {__APP_VERSION__}. Ilustrações dos exercícios: Everkinetic (CC BY-SA 4.0).</p>
        <UpdateControls />
        <WhatsNewButton />
        <ErrorLogButton />
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

  const settings = useAppStore(s => s.data?.settings);
  const lastBackupAt = useAppStore(s => s.data?.meta.lastBackupAt);
  const [protect, setProtect] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const passwordProblem = !protect ? '' : newPassword.length < 6 ? 'A senha precisa de pelo menos 6 caracteres.'
    : newPassword !== repeat ? 'As senhas não conferem.' : '';
  const exportNow = async () => {
    if (passwordProblem) { setMessage(passwordProblem); return; }
    await useAppStore.getState().flush();
    const data = useAppStore.getState().data;
    if (!data) return;
    try {
      const backup = buildBackup(data, __APP_VERSION__);
      // com senha: o mesmo formato cifrado do app atual (AES-GCM + PBKDF2), lido nos dois apps
      const content = JSON.stringify(protect ? await encryptBackup(backup, newPassword, __APP_VERSION__) : backup);
      // a mensagem de sucesso só aparece depois que o arquivo foi de fato gravado
      const result = await saveBackupFile(`treino-backup-${toDateKey(new Date())}.json`, content);
      if (result === 'saved') run(d => updateMeta(d, { lastBackupAt: new Date().toISOString() }));
      setMessage(result === 'saved' ? (protect ? 'Backup com senha salvo. Sem a senha, ele não pode ser aberto.' : 'Backup salvo.') : '');
    } catch (e) {
      useErrorLog.getState().report(e, 'Backup');
      setMessage('Não foi possível salvar o backup.');
    }
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
      {lastBackupAt && <p className="text-xs text-faint">Último backup: {new Date(lastBackupAt).toLocaleDateString('pt-BR')}</p>}
      <Toggle label="Proteger o backup com senha" checked={protect} onChange={setProtect} />
      {protect && (
        <div className="grid grid-cols-2 gap-2">
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} aria-label="Nova senha do backup" placeholder="Senha" className={`${INPUT} mt-0`} />
          <input type="password" value={repeat} onChange={e => setRepeat(e.target.value)} aria-label="Repita a senha" placeholder="Repita" className={`${INPUT} mt-0`} />
          {passwordProblem && newPassword && <p className="col-span-2 text-xs text-warning">{passwordProblem}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void exportNow()} className="h-12 rounded-xl bg-primary font-bold text-white">Fazer backup</button>
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
      {canAutoBackup() && settings && (
        <>
          <Toggle label="Backup automático" checked={settings.autoBackup ?? true} onChange={v => run((d, t) => updateSettings(d, { autoBackup: v }, t))} />
          <p className="text-xs text-faint">Depois de cada treino ou pesagem, uma cópia do dia vai para Downloads/TreinoPersonalizado (as 7 mais recentes). Fica no aparelho mesmo se o app for desinstalado.</p>
        </>
      )}
    </Card>
  );
}

function ErrorLogButton() {
  const entries = useErrorLog(s => s.entries);
  const [copied, setCopied] = useState(false);
  if (!entries.length) return null;
  return (
    <button type="button" className="h-11 font-semibold text-primary" onClick={() => {
      navigator.clipboard.writeText(errorReport(entries, __APP_VERSION__, navigator.userAgent)).then(() => setCopied(true), () => setCopied(false));
    }}>
      {copied ? 'Registro copiado' : `Copiar registro de erros (${entries.length})`}
    </button>
  );
}

function ReminderToggle({ on, set }: { on: boolean; set: (patch: Partial<Settings>) => void }) {
  const plan = useAppStore(s => (s.data?.activePlanId ? s.data.plans[s.data.activePlanId] : undefined));
  const hasTime = !!plan && !!parseTrainingTime(plan.trainingTime);
  const [denied, setDenied] = useState(false);
  return (
    <>
      <Toggle label="Lembrete nos dias de treino" checked={on} onChange={async v => {
        if (v && !(await ensureNotificationPermission(true))) { setDenied(true); return; }
        setDenied(false);
        set({ trainingReminders: v });
        if (v) resyncReminders();
      }} />
      {on && !hasTime && <p className="text-xs text-warning">Defina o horário do treino em Plano → Planos para receber o lembrete.</p>}
      {on && hasTime && <p className="text-xs text-faint">Às {plan!.trainingTime}, nos dias obrigatórios com exercícios.</p>}
      {denied && <p className="text-xs text-warning">Permissão de notificações não concedida.</p>}
    </>
  );
}

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' }
];

function ThemeChoice({ value, onChange }: { value: ThemePref; onChange: (v: ThemePref) => void }) {
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
      {THEMES.map(t => (
        <button key={t.id} type="button" role="radio" aria-checked={value === t.id} onClick={() => onChange(t.id)}
          className={`min-h-11 rounded-lg text-sm font-semibold ${value === t.id ? 'bg-primary text-white' : 'text-muted'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
