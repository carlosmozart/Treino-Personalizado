import { useRef, useState } from 'react';
import { updateMeta, updateSettings } from '../../domain/actions';
import { buildBackup, readBackup } from '../../domain/backup';
import { historyCsv } from '../../domain/history-csv';
import { canAutoBackup, saveBackupFile } from '../../platform/backup-file';
import { isNative } from '../../platform/platform';
import { dataStatus } from '../../domain/data-status';
import { errorReport, useErrorLog } from '../../platform/error-log';
import { toDateKey } from '../../domain/dates';
import { loadSourceOf, type AppData, type LoadSource, type Settings, type ThemePref } from '../../domain/model';
import { mergeBackup, restoreBackup } from '../../domain/profile-view';
import { Sheet } from '../../ui/Sheet';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { DurationWheel } from '../../ui/DurationWheel';
import { ACCENTS } from '../../ui/theme';
import { plural } from '../../ui/format';
import { Card, INPUT } from './ProfileScreen';
import { AlarmSettings } from './AlarmSettings';
import { UpdateControls } from './UpdateOffer';
import { WhatsNewButton } from './WhatsNew';
import { CreditsButton } from './Credits';
import { encryptBackup } from '../../domain/backup-crypto';
import { ensureNotificationPermission, notificationsAvailable } from '../../platform/notifications';
import { resyncReminders } from '../plan/reminders-sync';
import { parseTrainingTime } from '../../domain/reminders';
import { halloweenOn, seasonalPref, type SeasonalPref } from '../../domain/seasonal';

/** Configurações agrupadas (O19): treino, dados e backup, conta, sobre. */
export function SettingsSection() {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  if (!settings) return null;
  const set = (patch: Partial<Settings>) => run((d, t) => updateSettings(d, patch, t));

  return (
    <>
      <Card title="Treino">
        <WorkoutSettingsFields />
        <AlarmSettings />
        {notificationsAvailable() && <ReminderToggle on={!!settings.trainingReminders} set={set} />}
        <WeekStartChoice value={settings.weekStart ?? 'seg'} onChange={v => set({ weekStart: v })} />
      </Card>
      <Card title="Aparência">
        <ThemeChoice value={settings.theme ?? 'system'} onChange={v => set({ theme: v })} />
        {/* M25: cor de destaque */}
        <p className="mt-3 text-sm font-semibold text-muted">Cor de destaque</p>
        <div role="radiogroup" aria-label="Cor de destaque" className="mt-1 flex flex-wrap gap-2">
          {ACCENTS.map(a => {
            const on = (settings.accent ?? 'azul') === a.id;
            return (
              <button key={a.id} type="button" role="radio" aria-checked={on} aria-label={a.label} onClick={() => set({ accent: a.id })}
                className={`flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${on ? 'bg-surface-2 ring-2 ring-[var(--color-ink)]' : 'bg-surface-2 text-muted'}`}>
                <span aria-hidden="true" className="size-5 rounded-full" style={{ background: a.hex }} />{a.label}
              </button>
            );
          })}
        </div>
        <SeasonalChoice settings={settings} set={set} />
      </Card>
      <BackupCard />
      <Card title="Conta e nuvem">
        <p className="text-sm text-muted">Seus dados ficam guardados neste aparelho. Em breve: entrar com o Google para guardar uma cópia na nuvem e usar em mais de um aparelho.</p>
      </Card>
      <Card title="Sobre">
        <p className="text-sm text-muted">Versão {__APP_VERSION__}. Ilustrações dos exercícios: Everkinetic (CC BY-SA 4.0), detalhes em Créditos e licenças.</p>
        <UpdateControls />
        <WhatsNewButton />
        <CreditsButton />
        <ErrorLogButton />
      </Card>
    </>
  );
}

/**
 * Ajustes do treino em si: aparecem em Perfil → Treino e no painel aberto durante o treino (R5),
 * para mudar descanso, som ou o gesto sem sair da sessão.
 */
export function WorkoutSettingsFields() {
  const settings = useAppStore(s => s.data?.settings);
  const run = useAppStore(s => s.run);
  if (!settings) return null;
  const set = (patch: Partial<Settings>) => run((d, t) => updateSettings(d, patch, t));
  const toggle = (k: 'restAutoStart' | 'restSound' | 'restVibrate', label: string) =>
    <Toggle label={label} checked={settings[k]} onChange={v => set({ [k]: v })} />;
  return (
    <>
      <div>
        <p className="text-sm font-semibold text-muted">Descanso padrão</p>
        {/* R3: roda de minutos e segundos; o domínio mantém o descanso entre 15 s e 10 min */}
        <DurationWheel label="Descanso padrão" seconds={settings.restSeconds} min={15} max={600} onChange={n => set({ restSeconds: n })} />
      </div>
      <WarmupRestChoice value={settings.warmupRest} onChange={v => set({ warmupRest: v })} />
      {toggle('restAutoStart', 'Iniciar o descanso ao marcar a série')}
      {toggle('restSound', 'Som no fim do descanso')}
      {toggle('restVibrate', 'Vibrar no fim do descanso')}
      <LoadSourceChoice value={loadSourceOf(settings)} onChange={v => set({ loadSource: v, autoProgression: v === 'auto' })} />
      <Toggle label="Deslizar para apagar (esquerda) ou copiar (direita) séries e exercícios do plano" checked={settings.swipeSets ?? true} onChange={v => set({ swipeSets: v })} />
      <Toggle label="Botões de ajuste de carga no treino" checked={settings.weightButtons ?? true} onChange={v => set({ weightButtons: v })} />
      <Toggle label="Manter a tela ligada no treino" checked={settings.keepScreenOn ?? true} onChange={v => set({ keepScreenOn: v })} />
      <Toggle label="Pedir o peso do dia ao começar o treino" checked={settings.weighBeforeWorkout ?? false} onChange={v => set({ weighBeforeWorkout: v })} />
      <Toggle label="Mostrar ilustrações dos exercícios" checked={settings.showIllustrations ?? true} onChange={v => set({ showIllustrations: v })} />
      {(settings.showIllustrations ?? true) && (
        <div className="py-2">
          <p className="text-sm font-semibold text-muted">Tamanho da ilustração</p>
          <div role="radiogroup" aria-label="Tamanho da ilustração" className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {([['small', 'Pequena'], ['medium', 'Média'], ['large', 'Grande']] as const).map(([id, label]) => {
              const on = (settings.illustrationSize ?? 'medium') === id;
              return (
                <button key={id} type="button" role="radio" aria-checked={on} onClick={() => set({ illustrationSize: id })}
                  className={`min-h-11 rounded-lg text-sm font-semibold ${on ? 'bg-primary text-white' : 'text-muted'}`}>{label}</button>
              );
            })}
          </div>
        </div>
      )}
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
  // T1: o backup lido espera a escolha entre juntar e substituir
  const [choice, setChoice] = useState<{ data: AppData; summary: string } | null>(null);
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

  // T9: o histórico em planilha, para abrir no Excel ou no Google Planilhas
  const exportCsv = async () => {
    await useAppStore.getState().flush();
    const workouts = useAppStore.getState().data?.workouts ?? [];
    if (!workouts.length) { setMessage('Ainda não há treinos para exportar.'); return; }
    try {
      const result = await saveBackupFile(`treino-historico-${toDateKey(new Date())}.csv`, historyCsv(workouts));
      setMessage(result === 'saved' ? `Histórico exportado: ${plural(workouts.length, 'treino', 'treinos')}, uma linha por série.` : '');
    } catch (e) {
      useErrorLog.getState().report(e, 'Exportar CSV');
      setMessage('Não foi possível exportar o histórico.');
    }
  };

  const tryRead = async (text: string, pass?: string) => {
    const result = await readBackup(text, pass);
    if (result.kind === 'needs-password') { setPending({ text, needsPassword: true }); setMessage(pass ? 'Senha incorreta.' : 'Este backup tem senha.'); return; }
    if (result.kind === 'invalid') { setPending(null); setMessage(result.reason); return; }
    const d: AppData = result.data;
    const summary = `${plural(d.workouts.length, 'treino', 'treinos')}, ${plural(Object.keys(d.plans).length, 'plano', 'planos')}`;
    setPending(null); setPassword('');
    setMessage('');
    setChoice({ data: d, summary });
  };
  const restore = (how: 'merge' | 'replace') => {
    if (!choice) return;
    const { data: d, summary } = choice;
    if (how === 'merge') run(cur => mergeBackup(cur, d));
    else run((cur, now) => restoreBackup(cur, d, now));
    setChoice(null);
    setMessage(how === 'merge' ? `Backup juntado aos dados deste aparelho (${summary} no arquivo).` : `Backup restaurado: ${summary}.`);
  };

  return (
    <Card title="Dados e backup">
      {/* N14: onde os dados estão, se há cópia automática e quando foi o último backup */}
      {(() => {
        const st = dataStatus({ native: isNative(), autoBackup: canAutoBackup() && (settings?.autoBackup ?? true), lastBackupAt, now: new Date() });
        return (
          <div aria-label="Onde ficam seus dados" role="group" className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <p className="font-semibold">Onde ficam seus dados</p>
            <p className="text-muted">{st.where}</p>
            <p className="text-muted">{st.copy}</p>
            <p className={st.stale ? 'text-warning' : 'text-muted'}>{st.backup}</p>
          </div>
        );
      })()}
      <p className="text-sm text-muted">Guarde um arquivo com tudo (treinos, planos, peso) fora do aparelho. Aceita backups do app atual.</p>
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
      <button type="button" onClick={() => void exportCsv()} className="h-11 w-full rounded-xl text-sm font-semibold text-muted">
        Exportar o histórico em planilha (CSV)
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Arquivo de backup"
        onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await tryRead(await f.text()); }} />
      {pending?.needsPassword && (
        <form onSubmit={e => { e.preventDefault(); void tryRead(pending.text, password); }} className="flex gap-2">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} aria-label="Senha do backup" placeholder="Senha do backup" className={`${INPUT} mt-0`} />
          <button type="submit" className="h-12 shrink-0 rounded-xl bg-surface-2 px-4 font-bold">Abrir</button>
        </form>
      )}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <Sheet title="Restaurar backup" open={choice !== null} onClose={() => { setChoice(null); setMessage('Restauração cancelada.'); }}>
        <div className="space-y-3 px-1 pb-3">
          <p className="text-sm text-muted">O arquivo tem {choice?.summary}.</p>
          <button type="button" onClick={() => restore('merge')} className="w-full rounded-xl bg-primary p-3 text-left text-white">
            <span className="block font-bold">Juntar com os dados atuais</span>
            <span className="block text-sm opacity-90">Fica tudo o que já está aqui e entra o que só existe no backup. Se o mesmo registro estiver nos dois, vale o que foi alterado por último.</span>
          </button>
          <button type="button" onClick={() => restore('replace')} className="w-full rounded-xl bg-surface-2 p-3 text-left">
            <span className="block font-bold text-danger">Substituir tudo pelo backup</span>
            <span className="block text-sm text-muted">Os dados atuais deste aparelho são apagados e ficam só os do arquivo.</span>
          </button>
        </div>
      </Sheet>
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

/** M19: em que dia a semana começa (faixa do Início, meta da semana, gráficos e deload). */
function WeekStartChoice({ value, onChange }: { value: 'seg' | 'dom'; onChange: (v: 'seg' | 'dom') => void }) {
  return (
    <div className="py-2">
      <p className="text-sm font-semibold text-muted">A semana começa na</p>
      <div role="radiogroup" aria-label="A semana começa na" className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {([['seg', 'Segunda'], ['dom', 'Domingo']] as const).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}
            className={`min-h-11 rounded-lg text-sm font-semibold ${value === id ? 'bg-primary text-white' : 'text-muted'}`}>{label}</button>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">Vale para a semana do Início, a meta de treinos da semana, a refeição livre e os gráficos por semana.</p>
    </div>
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
      {on && hasTime && <p className="text-xs text-faint">Às {plan!.trainingTime}, nos dias de treino do plano. Não toca no dia em que você já treinou nem no dia marcado como sem treino.</p>}
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

const SEASONAL: { id: SeasonalPref; label: string }[] = [
  { id: 'auto', label: 'Automático' },
  { id: 'on', label: 'Sempre' },
  { id: 'off', label: 'Desligado' }
];

/** Tema de época (Halloween): aranha, morcegos, teias, gatinhos de chapéu e uma abóbora escondida. */
function SeasonalChoice({ settings, set }: { settings: Settings; set: (patch: Partial<Settings>) => void }) {
  const pref = seasonalPref(settings);
  const on = halloweenOn(settings, toDateKey(new Date()));
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-muted">Temas de época</p>
      <div role="radiogroup" aria-label="Temas de época" className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {SEASONAL.map(o => (
          <button key={o.id} type="button" role="radio" aria-checked={pref === o.id} onClick={() => set({ seasonalTheme: o.id })}
            className={`min-h-11 rounded-lg text-sm font-semibold ${pref === o.id ? 'bg-primary text-white' : 'text-muted'}`}>{o.label}</button>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">
        {pref === 'off' ? 'Sem decorações de época.'
          : pref === 'on' ? 'Halloween o ano todo: aranha, morcegos, teias, gatinhos de chapéu de bruxa e uma abóbora escondida no Início.'
          : `Halloween de 20 a 31 de outubro${on ? ' (valendo agora)' : ''}: aranha, morcegos, teias, gatinhos de chapéu de bruxa e uma abóbora escondida no Início.`}
      </p>
      {pref !== 'off' && (
        <>
          <Toggle label="Cores de abóbora" checked={settings.seasonalColors ?? true} onChange={v => set({ seasonalColors: v })} />
          <Toggle label="Também durante o treino (só uma abóbora parada)" checked={settings.seasonalInWorkout ?? true} onChange={v => set({ seasonalInWorkout: v })} />
        </>
      )}
    </div>
  );
}

const LOAD_SOURCES: { id: LoadSource; label: string; hint: string }[] = [
  { id: 'auto', label: 'Sugerida', hint: 'A progressão automática sugere a carga pelo histórico e diz o porquê.' },
  { id: 'last', label: 'Última vez', hint: 'Repete a carga da última vez, com as repetições do plano.' },
  { id: 'plan', label: 'Do plano', hint: 'Usa a carga e as repetições escritas no plano.' }
];

/** T6: descanso depois de uma série de aquecimento: igual às outras, nenhum ou um tempo próprio. */
function WarmupRestChoice({ value, onChange }: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  const mode = value === undefined ? 'same' : value === 0 ? 'none' : 'own';
  const options = [['same', 'Igual'], ['none', 'Sem'], ['own', 'Próprio']] as const;
  return (
    <div className="py-2">
      <p className="text-sm font-semibold text-muted">Descanso depois do aquecimento</p>
      <div role="radiogroup" aria-label="Descanso depois do aquecimento" className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {options.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id}
            onClick={() => onChange(id === 'same' ? undefined : id === 'none' ? 0 : (value || 45))}
            className={`min-h-11 rounded-lg text-sm font-semibold ${mode === id ? 'bg-primary text-white' : 'text-muted'}`}>{label}</button>
        ))}
      </div>
      {mode === 'own' && <DurationWheel label="Descanso depois do aquecimento" seconds={value!} min={15} max={600} onChange={onChange} />}
      <p className="mt-1 text-xs text-faint">{mode === 'same' ? 'Usa o mesmo descanso das outras séries.' : mode === 'none' ? 'Marcar uma série de aquecimento não começa o descanso.' : 'Vale para todos os exercícios.'}</p>
    </div>
  );
}

/** M13: de onde vêm carga e repetições ao abrir o treino. */
function LoadSourceChoice({ value, onChange }: { value: LoadSource; onChange: (v: LoadSource) => void }) {
  return (
    <div className="py-2">
      <p className="text-sm font-semibold text-muted">Carga ao abrir o treino</p>
      <div role="radiogroup" aria-label="Carga ao abrir o treino" className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {LOAD_SOURCES.map(o => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
            className={`min-h-11 rounded-lg text-sm font-semibold ${value === o.id ? 'bg-primary text-white' : 'text-muted'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">{LOAD_SOURCES.find(o => o.id === value)?.hint}</p>
    </div>
  );
}
