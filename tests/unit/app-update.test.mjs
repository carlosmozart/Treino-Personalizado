import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/ui/app-update.js', import.meta.url), 'utf8');
const PREFIX = 'https://github.com/carlosmozart/Treino-Personalizado/releases/download/';
const HASH = 'a'.repeat(64);

function load() {
  const context = vm.createContext({ window: {}, console: { error: vi.fn() } });
  vm.runInContext(source, context);
  return context.window;
}

function release(overrides = {}) {
  return {
    tag_name: 'v2.21.0', draft: false, prerelease: false, body: '',
    assets: [{ name: 'treino-personalizado-v2.21.0.apk', size: 5_000_000,
      browser_download_url: `${PREFIX}v2.21.0/treino-personalizado-v2.21.0.apk`, digest: `sha256:${HASH}` }],
    ...overrides
  };
}

function setup({ releaseJson = release(), status = 200, confirm = true, isNative = true, lastCheck = '0' } = {}) {
  const window = load();
  const nodes = {};
  const store = { treino_update_last_check: lastCheck };
  const plugin = {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    download: vi.fn(async () => ({ bytes: 1 })),
    install: vi.fn(async () => {})
  };
  window.Capacitor = { Plugins: { AppUpdate: plugin } };
  const fetch = vi.fn(async () => ({ ok: status === 200, status, json: async () => releaseJson }));
  const askConfirm = vi.fn(async () => confirm);
  const el = () => ({ textContent: '', classList: { toggle: vi.fn() } });
  const api = window.TREINO_APP_UPDATE.create({
    document: { getElementById: id => (nodes[id] ||= el()) }, window, fetch,
    PLATFORM: { isNative }, APP_VERSION: '2.20.3',
    loadString: k => store[k], saveString: (k, v) => { store[k] = v; },
    askConfirm, escapeHtml: s => s, now: () => 10 * 86_400_000
  });
  return { api, plugin, fetch, askConfirm, nodes, store, window };
}

test('compara versões numericamente e ignora prefixo e metadados', () => {
  const { TREINO_APP_UPDATE: u } = load();
  expect(u.compareVersions('2.20.10', '2.20.9')).toBe(1);
  expect(u.compareVersions('v2.21.0', '2.20.3')).toBe(1);
  expect(u.compareVersions('2.20.3+build.7', '2.20.3')).toBe(0);
  expect(u.compareVersions('2.20.2', '2.20.3')).toBe(-1);
});

test('lê APK e hash da release e recusa o que não é confiável', () => {
  const { TREINO_APP_UPDATE: u } = load();
  expect(u.parseRelease(release())).toMatchObject({ version: '2.21.0', sha256: HASH });
  const semDigest = release();
  delete semDigest.assets[0].digest;
  expect(u.parseRelease(semDigest)).toBeNull();
  expect(u.parseRelease({ ...semDigest, body: `SHA-256: \`${'B'.repeat(64)}\`` }).sha256).toBe('b'.repeat(64));
  expect(u.parseRelease(release({ prerelease: true }))).toBeNull();
  const outroHost = release();
  outroHost.assets[0].browser_download_url = 'https://exemplo.com/app.apk';
  expect(u.parseRelease(outroHost)).toBeNull();
});

test('baixa e instala quando há versão nova e o usuário aceita', async () => {
  const { api, plugin, askConfirm } = setup();
  await api.checkForUpdate({ manual: true });
  expect(askConfirm).toHaveBeenCalledOnce();
  expect(plugin.download).toHaveBeenCalledWith({ url: `${PREFIX}v2.21.0/treino-personalizado-v2.21.0.apk`, sha256: HASH });
  expect(plugin.install).toHaveBeenCalledOnce();
});

test('não oferece nada se a versão já é a atual ou o usuário recusa', async () => {
  const atual = setup({ releaseJson: release({ tag_name: 'v2.20.3' }) });
  await atual.api.checkForUpdate({ manual: true });
  expect(atual.askConfirm).not.toHaveBeenCalled();
  expect(atual.nodes.appUpdateStatus.textContent).toContain('mais recente');

  const recusa = setup({ confirm: false });
  await recusa.api.checkForUpdate({ manual: true });
  expect(recusa.plugin.download).not.toHaveBeenCalled();
});

test('verificação automática respeita o intervalo diário e fica fora da web', async () => {
  const recente = setup({ lastCheck: String(10 * 86_400_000 - 1000) });
  await recente.api.checkForUpdate();
  expect(recente.fetch).not.toHaveBeenCalled();

  const web = setup({ isNative: false });
  await web.api.checkForUpdate({ manual: true });
  expect(web.fetch).not.toHaveBeenCalled();
});

test('pede a permissão de instalação sem tratar como erro', async () => {
  const { api, plugin, nodes } = setup();
  plugin.install.mockRejectedValueOnce(Object.assign(new Error('perm'), { code: 'NEEDS_PERMISSION' }));
  await api.checkForUpdate({ manual: true });
  expect(nodes.appUpdateStatus.textContent).toContain('instalar apps desconhecidos');
});
