// Atualização do APK: consulta a release do GitHub (no máximo uma vez por dia, ou pelo botão),
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
