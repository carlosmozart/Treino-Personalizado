import { backupReminderDue, updateMeta } from '../../domain/actions';
import { canAutoBackup } from '../../platform/backup-file';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';

/**
 * Avisos no topo do Início: boas-vindas para quem instala do zero (o cadastro do app antigo
 * era obrigatório; aqui é um convite, sem travar o app) e lembrete de backup.
 */
export function HomeNotices() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const setTab = useUiStore(s => s.setTab);
  if (!data) return null;
  const welcome = !data.profile.name.trim() && !data.meta.hintsSeen.welcome;
  const autoOn = canAutoBackup() && (data.settings.autoBackup ?? true);
  const backup = backupReminderDue(data, new Date(), autoOn);
  const dismiss = (hint: string) => run(d => updateMeta(d, { hintsSeen: { [hint]: true } }));

  return (
    <>
      {welcome && (
        <section className="rounded-2xl border border-primary bg-surface p-4">
          <h2 className="text-lg font-bold">Bem-vindo(a)!</h2>
          <p className="mt-1 text-muted">Conte um pouco sobre você — nome, altura, peso e nível de atividade — para o app calcular sua meta de água, o gasto calórico e o progresso.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => dismiss('welcome')} className="h-12 rounded-xl bg-surface-2 font-bold">Agora não</button>
            <button type="button" onClick={() => { dismiss('welcome'); setTab('perfil'); }} className="h-12 rounded-xl bg-primary font-bold text-white">Preencher</button>
          </div>
        </section>
      )}
      {backup && (
        <section className="rounded-2xl border border-warning/50 bg-surface p-4">
          <h2 className="font-bold">Faça um backup</h2>
          <p className="mt-1 text-sm text-muted">
            {data.meta.lastBackupAt ? 'Seu último backup tem mais de 2 semanas.' : 'Você ainda não fez nenhum backup.'} Se o celular for trocado ou o app apagado, os treinos se perdem.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => dismiss('backupReminderOff')} className="h-11 rounded-xl bg-surface-2 text-sm font-bold">Não lembrar</button>
            <button type="button" onClick={() => setTab('perfil')} className="h-11 rounded-xl bg-primary text-sm font-bold text-white">Fazer backup</button>
          </div>
        </section>
      )}
    </>
  );
}
