// Y6: "Relatar um problema" abre o formulário de problema do GitHub no navegador, com a versão, o
// aparelho e os últimos erros já preenchidos. Nada sai do app sozinho: a pessoa vê e publica lá.
import type { ErrorEntry } from './error-log';

export const ISSUE_FORM = 'https://github.com/carlosmozart/Treino-Personalizado/issues/new';
/** O registro de erros vai no endereço: cortado para o link não ficar longo demais. */
const MAX_LOG = 2500;

/** "Android 17 · SM-S926B", "iOS 18.1" ou o começo do navegador. */
export function deviceFrom(userAgent: string): string {
  const android = /Android ([\d.]+);\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/.exec(userAgent);
  if (android) return `Android ${android[1]} · ${android[2]!.trim()}`;
  const ios = /(?:iPhone|CPU) OS ([\d_]+)/.exec(userAgent);
  if (ios) return `iOS ${ios[1]!.replace(/_/g, '.')}`;
  return userAgent.slice(0, 120);
}

export function problemReportUrl(appVersion: string, userAgent: string, errors: readonly ErrorEntry[] = []): string {
  const log = errors.slice(-5).map(e => `[${e.at}] ${e.message}\n${e.detail}`).join('\n\n');
  const params = new URLSearchParams({
    template: 'problema.yml',
    versao: appVersion,
    aparelho: deviceFrom(userAgent),
    ...(log ? { registro: log.length > MAX_LOG ? `${log.slice(0, MAX_LOG)}\n…` : log } : {})
  });
  return `${ISSUE_FORM}?${params.toString()}`;
}
