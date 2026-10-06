// Atualização do APK pelo próprio app (porta de js/ui/app-update.js): comparação de versões e
// leitura da release do GitHub. O download e a instalação ficam no AppUpdatePlugin (nativo).

export const RELEASES_URL = 'https://api.github.com/repos/carlosmozart/Treino-Personalizado/releases/latest';
export const DOWNLOAD_PREFIX = 'https://github.com/carlosmozart/Treino-Personalizado/releases/download/';
// Consulta toda vez que o app abre ou volta à tela; a folga de 2 min só evita repetir ao alternar
// entre apps no treino (a API do GitHub aceita 60 consultas/h por IP).
export const CHECK_INTERVAL_MS = 2 * 60 * 1000;

/** "2.20.10" > "2.20.9"; ignora "v" e o que vem depois de "+" ou "-". */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/i, '').split(/[+-]/)[0]!.split('.').map(n => parseInt(n, 10) || 0);
  const pa = parse(a), pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export interface ReleaseInfo { version: string; url: string; sha256: string; size: number; notes: string }

/** Versão, APK e SHA-256 (do campo digest do arquivo ou da linha "SHA-256:" das notas). */
export function parseRelease(release: unknown, prefix = DOWNLOAD_PREFIX): ReleaseInfo | null {
  if (!release || typeof release !== 'object') return null;
  const r = release as { draft?: boolean; prerelease?: boolean; tag_name?: string; body?: string; assets?: unknown[] };
  if (r.draft || r.prerelease || !r.tag_name) return null;
  const apk = (r.assets ?? []).map(a => a as { name?: string; browser_download_url?: string; digest?: string; size?: number })
    .find(a => /\.apk$/i.test(a.name ?? '') && (a.browser_download_url ?? '').startsWith(prefix));
  if (!apk) return null;
  const sha = (/^sha256:([0-9a-f]{64})$/i.exec(apk.digest ?? '') ?? /SHA-256:\s*`?([0-9a-f]{64})/i.exec(r.body ?? ''))?.[1];
  if (!sha) return null;
  return { version: r.tag_name.replace(/^v/i, ''), url: apk.browser_download_url!, sha256: sha.toLowerCase(), size: apk.size ?? 0, notes: r.body ?? '' };
}

/** Há versão mais nova para oferecer? */
export function isNewer(info: ReleaseInfo | null, current: string): info is ReleaseInfo {
  return !!info && compareVersions(info.version, current) > 0;
}
