// Atualização do APK: consulta a release do GitHub (sempre que o app abre ou volta à tela, ou pelo botão),
// oferece a versão nova e usa o AppUpdatePlugin nativo para baixar, conferir o SHA-256 e abrir o
// instalador do Android. Os dados ficam: é o mesmo app, atualizado por cima.
import { create } from 'zustand';
import { CHECK_INTERVAL_MS, isNewer, parseRelease, RELEASES_URL, type ReleaseInfo } from '../domain/app-update';
import { isNative } from './platform';

interface AppUpdatePlugin {
  download(o: { url: string; sha256: string }): Promise<unknown>;
  install(): Promise<unknown>;
  addListener(event: 'downloadProgress', cb: (p: { percent: number }) => void): Promise<{ remove(): void }>;
}

function plugin(): AppUpdatePlugin | null {
  if (!isNative()) return null;
  return (globalThis as { Capacitor?: { Plugins?: { AppUpdate?: AppUpdatePlugin } } }).Capacitor?.Plugins?.AppUpdate ?? null;
}

export const updatesAvailable = () => plugin() !== null;

const LAST_CHECK_KEY = 'vigor-update-last-check';

interface UpdateState {
  status: string;
  offer: ReleaseInfo | null;
  busy: boolean;
  check(manual: boolean): Promise<void>;
  install(info: ReleaseInfo): Promise<void>;
  dismiss(): void;
}

/**
 * Resolve quando o app está na tela. O Android 10+ não deixa abrir o instalador com o app em segundo
 * plano (a tela simplesmente não aparece): se o download terminou com a pessoa em outro app, o
 * instalador espera ela voltar.
 */
export function whenVisible(doc: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> | undefined = globalThis.document): Promise<void> {
  if (!doc || doc.visibilityState !== 'hidden') return Promise.resolve();
  return new Promise(resolve => {
    const on = () => {
      if (doc.visibilityState === 'hidden') return;
      doc.removeEventListener('visibilitychange', on);
      resolve();
    };
    doc.addEventListener('visibilitychange', on);
  });
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const code = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '');

export const useUpdate = create<UpdateState>((set, get) => ({
  status: '',
  offer: null,
  busy: false,

  async check(manual) {
    if (!updatesAvailable() || get().busy) return;
    if (!manual) {
      let last = 0;
      try { last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0); } catch { /* sem armazenamento */ }
      if (Date.now() - last < CHECK_INTERVAL_MS) return;
    }
    set({ busy: true, status: manual ? 'Procurando atualização…' : '' });
    try {
      const res = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      const info = res.status === 404 ? null : res.ok ? parseRelease(await res.json()) : (() => { throw new Error(`GitHub ${res.status}`); })();
      try { localStorage.setItem(LAST_CHECK_KEY, String(Date.now())); } catch { /* sem armazenamento */ }
      if (isNewer(info, __APP_VERSION__)) set({ offer: info, status: `Nova versão disponível: ${info.version}.` });
      else if (manual) set({ status: `Você já está na versão mais recente (${__APP_VERSION__}).` });
    } catch (e) {
      if (manual) set({ status: `Não foi possível verificar agora (${errMsg(e)}). Confira a internet.` });
    } finally {
      set({ busy: false });
    }
  },

  async install(info) {
    const p = plugin();
    if (!p || get().busy) return;
    set({ busy: true, offer: null, status: 'Baixando atualização…' });
    const listener = await p.addListener('downloadProgress', e => set({ status: e.percent >= 0 ? `Baixando atualização… ${e.percent}%` : 'Baixando atualização…' }));
    try {
      await p.download({ url: info.url, sha256: info.sha256 });
      // trocou de app no meio do download: o instalador abre quando voltar
      if (globalThis.document?.visibilityState === 'hidden') set({ status: 'Download conferido. Volte ao app para instalar.' });
      await whenVisible();
      set({ status: 'Download conferido. Abrindo o instalador…' });
      await p.install();
      set({ status: '' });
    } catch (e) {
      set({ status: code(e) === 'NEEDS_PERMISSION'
        ? 'Libere "instalar apps desconhecidos" para este app e toque em "Procurar atualização" de novo.'
        : `A atualização falhou: ${errMsg(e)}` });
    } finally {
      listener.remove();
      set({ busy: false });
    }
  },

  dismiss: () => set({ offer: null })
}));
