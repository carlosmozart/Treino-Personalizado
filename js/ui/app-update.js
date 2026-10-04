window.TREINO_APP_UPDATE = {
  RELEASES_URL: 'https://api.github.com/repos/carlosmozart/Treino-Personalizado/releases/latest',
  DOWNLOAD_PREFIX: 'https://github.com/carlosmozart/Treino-Personalizado/releases/download/',
  CHECK_INTERVAL_MS: 24 * 60 * 60 * 1000,

  // "2.20.10" > "2.20.9"; ignora prefixo "v" e metadados após "+" ou "-".
  compareVersions(a, b) {
    const parse = v => String(v || '').replace(/^v/i, '').split(/[+-]/)[0].split('.').map(n => parseInt(n, 10) || 0);
    const pa = parse(a), pb = parse(b);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff) return diff > 0 ? 1 : -1;
    }
    return 0;
  },

  // Extrai versão, APK e SHA-256 da resposta da API de releases. O hash vem do campo
  // `digest` do asset ou, como reserva, da linha "SHA-256: <hex>" nas notas da release.
  parseRelease(release, prefix = window.TREINO_APP_UPDATE.DOWNLOAD_PREFIX) {
    if (!release || release.draft || release.prerelease || !release.tag_name) return null;
    const apk = (release.assets || []).find(a => /\.apk$/i.test(a.name || '')
      && String(a.browser_download_url || '').startsWith(prefix));
    if (!apk) return null;
    const fromDigest = /^sha256:([0-9a-f]{64})$/i.exec(apk.digest || '');
    const fromBody = /SHA-256:\s*`?([0-9a-f]{64})/i.exec(release.body || '');
    const sha256 = (fromDigest || fromBody || [])[1];
    if (!sha256) return null;
    return {
      version: release.tag_name.replace(/^v/i, ''),
      url: apk.browser_download_url,
      sha256: sha256.toLowerCase(),
      size: apk.size || 0
    };
  },

  create({ document, window, fetch, PLATFORM, APP_VERSION, loadString, saveString, askConfirm, escapeHtml, now = () => Date.now() }) {
    const self = window.TREINO_APP_UPDATE;
    const LAST_CHECK_KEY = 'treino_update_last_check';
    let busy = false;

    function plugin() {
      return PLATFORM.isNative && window.Capacitor && window.Capacitor.Plugins
        ? window.Capacitor.Plugins.AppUpdate : null;
    }
    function isAvailable() { return !!plugin(); }

    function setStatus(text) {
      const el = document.getElementById('appUpdateStatus');
      if (el) {
        el.textContent = text || '';
        el.classList.toggle('hidden', !text);
      }
    }

    async function fetchLatest() {
      const res = await fetch(self.RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (res.status === 404) return null; // ainda não há release publicada
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      return self.parseRelease(await res.json());
    }

    async function downloadAndInstall(info) {
      const AppUpdate = plugin();
      const listener = await AppUpdate.addListener('downloadProgress', p => {
        setStatus(p.percent >= 0 ? `Baixando atualização… ${p.percent}%` : 'Baixando atualização…');
      });
      try {
        setStatus('Baixando atualização…');
        await AppUpdate.download({ url: info.url, sha256: info.sha256 });
        setStatus('Download verificado. Abrindo o instalador…');
        await installDownloaded();
      } finally {
        listener.remove();
      }
    }

    async function installDownloaded() {
      try {
        await plugin().install();
        setStatus('');
      } catch (e) {
        if (e && e.code === 'NEEDS_PERMISSION') {
          setStatus('Libere "instalar apps desconhecidos" para o Treino e toque em "Procurar atualização" de novo.');
          return;
        }
        throw e;
      }
    }

    async function offer(info) {
      const tamanho = info.size ? ` (${(info.size / 1048576).toFixed(1)} MB)` : '';
      return askConfirm({
        icon: '⬆️',
        title: `Versão ${escapeHtml(info.version)} disponível`,
        text: `Você está na v${escapeHtml(APP_VERSION)}. A atualização${tamanho} é baixada do GitHub, conferida pelo SHA-256 e instalada pelo Android. <strong>Seus treinos e dados continuam no aparelho.</strong>`,
        confirmLabel: 'Atualizar',
        cancelLabel: 'Agora não'
      });
    }

    // manual = toque no botão; automático = no máximo uma consulta por dia, silenciosa se falhar.
    async function checkForUpdate({ manual = false } = {}) {
      if (!isAvailable() || busy) return;
      if (!manual) {
        const last = parseInt(loadString(LAST_CHECK_KEY) || '0', 10);
        if (now() - last < self.CHECK_INTERVAL_MS) return;
      }
      busy = true;
      try {
        if (manual) setStatus('Procurando atualização…');
        const info = await fetchLatest();
        saveString(LAST_CHECK_KEY, String(now()));
        if (!info || self.compareVersions(info.version, APP_VERSION) <= 0) {
          if (manual) setStatus(`Você já está na versão mais recente (v${APP_VERSION}).`);
          return;
        }
        setStatus(`Nova versão disponível: v${info.version}.`);
        if (await offer(info)) await downloadAndInstall(info);
      } catch (e) {
        console.error('Falha na atualização:', e);
        if (manual) setStatus((e && e.message) || 'Não foi possível verificar agora. Confira a internet.');
      } finally {
        busy = false;
      }
    }

    function setup() {
      const box = document.getElementById('appUpdateBox');
      if (box) box.classList.toggle('hidden', !isAvailable());
      checkForUpdate();
    }

    return { setup, checkForUpdate, isAvailable };
  }
};
