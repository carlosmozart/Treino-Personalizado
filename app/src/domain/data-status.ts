// N14: linha de status dos dados nas configurações, no espírito de "sempre dizer onde estão os
// seus dados": onde ficam, se há cópia automática e quando foi o último backup.
import { fromDateKey, toDateKey } from './dates';

export interface DataStatusInput {
  /** APK (Capacitor) ou navegador/PWA. */
  native: boolean;
  /** Backup automático disponível (APK) e ligado. */
  autoBackup: boolean;
  lastBackupAt: string | null | undefined;
  now: Date;
}

export interface DataStatus {
  where: string;
  copy: string;
  backup: string;
  /** Último backup há mais de 14 dias, ou nenhum. */
  stale: boolean;
}

export function dataStatus({ native, autoBackup, lastBackupAt, now }: DataStatusInput): DataStatus {
  const where = native
    ? 'Neste celular, dentro do app. Nada vai para a internet.'
    : 'Neste navegador, neste aparelho. Nada vai para a internet; limpar os dados do site apaga tudo.';
  const copy = native && autoBackup
    ? 'Cópia automática em Downloads/TreinoPersonalizado depois de cada treino ou pesagem.'
    : native ? 'Cópia automática desligada.' : 'Sem cópia automática na versão web: faça backups de vez em quando.';
  if (!lastBackupAt) return { where, copy, backup: 'Você ainda não fez nenhum backup.', stale: true };
  const days = Math.round((fromDateKey(toDateKey(now)).getTime() - fromDateKey(toDateKey(new Date(lastBackupAt))).getTime()) / 86_400_000);
  const when = days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
  return { where, copy, backup: `Último backup: ${when} (${new Date(lastBackupAt).toLocaleDateString('pt-BR')}).`, stale: days > 14 };
}
