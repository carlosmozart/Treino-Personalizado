// Backup do app novo e leitura de qualquer backup já exportado (novo, antigo v1 ou com senha).
import { SCHEMA_VERSION, type AppData } from './model';
import { decryptBackup, isEncryptedBackup } from './backup-crypto';
import { isLegacyBackupEnvelope, parseLegacyData, safeTree } from './legacy/validate';
import { migrateLegacy, type MigrationReport } from './legacy/migrate';
import { normalizeAppData } from './sync';

export const BACKUP_VERSION = 3;
/** Teto de tamanho ao ler um arquivo: protege celulares modestos de arquivos errados ou enormes. */
export const MAX_BACKUP_BYTES = 15 * 1024 * 1024;

export interface BackupFile {
  app: 'treino-personalizado';
  backupVersion: typeof BACKUP_VERSION;
  appVersion: string;
  exportedAt: string;
  data: AppData;
}

export function buildBackup(data: AppData, appVersion: string, now = new Date()): BackupFile {
  return { app: 'treino-personalizado', backupVersion: BACKUP_VERSION, appVersion, exportedAt: now.toISOString(), data };
}

export type BackupReadResult =
  | { kind: 'ok'; data: AppData; source: 'current' | 'legacy'; exportedAt: string; report?: MigrationReport }
  | { kind: 'needs-password' }
  | { kind: 'invalid'; reason: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isDate = (v: unknown): boolean => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Conferência estrutural do AppData de um arquivo: o suficiente para nunca carregar lixo. */
export function isAppData(v: unknown): v is AppData {
  if (!isObj(v) || v.schemaVersion !== SCHEMA_VERSION || !safeTree(v)) return false;
  const { profile, plans, workouts, checkins, water, gamification, settings, meta } = v;
  if (!isObj(profile) || !Array.isArray(profile.weighIns)
    || !profile.weighIns.every(w => isObj(w) && isDate(w.date) && isNum(w.weight))) return false;
  if (!isObj(plans) || !Object.values(plans).every(p => isObj(p) && isStr(p.id) && isObj(p.days))) return false;
  if (!(v.activePlanId === null || isStr(v.activePlanId))) return false;
  if (!Array.isArray(workouts) || !workouts.every(w => isObj(w) && isStr(w.id) && isDate(w.date) && Array.isArray(w.entries)
    && w.entries.every(e => isObj(e) && isStr(e.key) && isStr(e.name) && Array.isArray(e.sets)
      && e.sets.every(s => isObj(s) && isNum(s.reps) && isNum(s.weight) && (s.kind === 'work' || s.kind === 'warmup'))))) return false;
  if (!isObj(checkins) || !Object.keys(checkins).every(isDate)) return false;
  if (!isObj(water) || !Object.entries(water).every(([d, ml]) => isDate(d) && isNum(ml))) return false;
  if (!isObj(gamification) || !isNum(gamification.totalXP)) return false;
  if (!isObj(settings) || !isNum(settings.restSeconds)) return false;
  // carimbos de sincronização: ausentes em backups antigos da 3.0 (completados ao ler)
  const { sync } = v;
  if (sync !== undefined && !(isObj(sync) && isObj(sync.changed) && isObj(sync.deleted)
    && [...Object.values(sync.changed), ...Object.values(sync.deleted)].every(isStr))) return false;
  return isObj(meta);
}

/**
 * Lê o texto de um arquivo de backup. Com senha errada, o arquivo protegido é recusado
 * (AES-GCM autentica); sem senha, devolve `needs-password` para a interface pedir.
 */
export async function readBackup(text: string, password?: string): Promise<BackupReadResult> {
  if (text.length > MAX_BACKUP_BYTES) return { kind: 'invalid', reason: 'Arquivo grande demais para ser um backup do app.' };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { kind: 'invalid', reason: 'O arquivo não é um backup do app (JSON inválido).' }; }
  return readBackupObject(parsed, password);
}

async function readBackupObject(parsed: unknown, password?: string): Promise<BackupReadResult> {
  if (!isObj(parsed) || parsed.app !== 'treino-personalizado') return { kind: 'invalid', reason: 'O arquivo não é um backup do Treino Personalizado.' };

  if (isEncryptedBackup(parsed)) {
    if (!password) return { kind: 'needs-password' };
    let inner: unknown;
    try { inner = await decryptBackup(parsed, password); } catch { return { kind: 'invalid', reason: 'Senha incorreta ou arquivo alterado.' }; }
    if (isObj(inner) && isEncryptedBackup(inner)) return { kind: 'invalid', reason: 'Backup protegido dentro de outro.' };
    return readBackupObject(inner);
  }

  const exportedAt = isStr(parsed.exportedAt) ? parsed.exportedAt : '';
  if (parsed.backupVersion === BACKUP_VERSION) {
    return isAppData(parsed.data)
      ? { kind: 'ok', data: normalizeAppData(parsed.data, new Date()), source: 'current', exportedAt }
      : { kind: 'invalid', reason: 'O backup está incompleto ou corrompido.' };
  }
  if (isLegacyBackupEnvelope(parsed)) {
    const legacy = parseLegacyData(parsed.data);
    if (!Object.keys(legacy.values).length) return { kind: 'invalid', reason: 'O backup antigo não tem dados reconhecíveis.' };
    const { data, report } = migrateLegacy(legacy);
    return { kind: 'ok', data, source: 'legacy', exportedAt, report };
  }
  return { kind: 'invalid', reason: 'Versão de backup desconhecida.' };
}
