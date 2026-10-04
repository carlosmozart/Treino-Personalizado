// Backup automático (O11): depois de finalizar treino ou registrar peso, grava a cópia do dia em
// Downloads/TreinoPersonalizado, mantendo as 7 mais recentes. Desligável nas configurações.
import { buildBackup } from '../domain/backup';
import { toDateKey } from '../domain/dates';
import type { AppData } from '../domain/model';

/** Houve treino novo ou pesagem nova (o que vale proteger)? */
export function worthAutoBackup(prev: AppData | null, next: AppData | null): boolean {
  if (!prev || !next || next === prev) return false;
  if (next.settings.autoBackup === false) return false;
  return next.workouts.length > prev.workouts.length || next.profile.weighIns.length !== prev.profile.weighIns.length
    || next.profile.weighIns.at(-1)?.weight !== prev.profile.weighIns.at(-1)?.weight;
}

export const autoBackupName = (now: Date) => `treino-auto-${toDateKey(now)}.json`;

interface Deps {
  subscribe(listener: (next: AppData | null, prev: AppData | null) => void): void;
  save(fileName: string, content: string): Promise<void>;
  onError(error: unknown): void;
  appVersion: string;
  delayMs?: number;
}

export function startAutoBackup({ subscribe, save, onError, appVersion, delayMs = 3000 }: Deps) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: AppData | null = null;
  subscribe((next, prev) => {
    latest = next;
    if (!worthAutoBackup(prev, next)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!latest) return;
      const now = new Date();
      save(autoBackupName(now), JSON.stringify(buildBackup(latest, appVersion, now))).catch(onError);
    }, delayMs);
  });
}
