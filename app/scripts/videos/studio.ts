// Estúdio dos vídeos: grava uma cena num celular (Pixel 7) e anota os momentos (toques, legendas,
// sucesso) para a montagem pôr os efeitos sonoros e os textos no tempo certo.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type Browser, type Locator, type Page } from '@playwright/test';
import { buildBackup } from '../../src/domain/backup';
import type { AppData } from '../../src/domain/model';
import pkg from '../../package.json' with { type: 'json' };
import { NOW } from './demo-data';

export const OUT = join(import.meta.dirname, '..', '..', '..', 'notas-locais', 'videos', 'gravacoes');
const VIEWPORT = { width: 412, height: 839 };
/**
 * O headless entrega a tela em pixels CSS (412 de largura). Para gravar em alta resolução, o
 * "aparelho" tem os pixels de um Pixel 7 (2,625 ×) e a página pede 412 px de largura: o navegador
 * amplia tudo, como um celular de verdade faz.
 */
const SCALE = 2.625;
const SCREEN = { width: Math.round(VIEWPORT.width * SCALE), height: Math.round(VIEWPORT.height * SCALE) };

export type Marker = { t: number; type: 'tap' | 'success' | 'whoosh' | 'caption' | 'type' | 'end'; text?: string };

/** Mostra cada toque como um círculo (num popover, por cima até dos painéis abertos). */
const TOUCH_SCRIPT = `
addEventListener('pointerdown', e => {
  const d = document.createElement('div');
  d.popover = 'manual';
  d.style.cssText = 'position:fixed;inset:auto;margin:0;padding:0;left:' + (e.clientX - 26) + 'px;top:' + (e.clientY - 26) + 'px;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid rgba(255,255,255,.85);pointer-events:none;transform:scale(.55);opacity:1;transition:transform .5s ease-out,opacity .5s ease-out;overflow:visible';
  document.body.appendChild(d);
  try { d.showPopover(); } catch {}
  requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.35)'; d.style.opacity = '0'; }));
  setTimeout(() => d.remove(), 650);
}, true);
const hide = document.createElement('style');
hide.textContent = '::-webkit-scrollbar{display:none} *{scrollbar-width:none}';
document.documentElement.appendChild(hide);
`;

export interface Scene {
  page: Page;
  /** Toca num elemento, com uma pausa antes (o olho acompanha) e depois. */
  tap(target: Locator, opts?: { before?: number; after?: number }): Promise<void>;
  /** Digita devagar, como uma pessoa. */
  type(target: Locator, text: string): Promise<void>;
  caption(text: string): void;
  mark(type: Marker['type'], text?: string): void;
  wait(ms: number): Promise<void>;
  /** Rola a tela devagar. */
  scroll(dy: number, ms?: number): Promise<void>;
}

/**
 * Grava uma cena: carrega os dados numa primeira aba (fora do vídeo), abre outra já com os dados e
 * grava só ela, quadro a quadro na resolução do celular (o vídeo do Playwright sai com 412 px de
 * largura). Salva em notas-locais/videos/gravacoes/<nome>/: os quadros (JPEG), quadros.json
 * (o tempo de cada um) e momentos.json.
 */
export async function record(browser: Browser, name: string, data: AppData, body: (s: Scene) => Promise<void>, opts: { theme?: 'dark' | 'light' } = {}) {
  mkdirSync(OUT, { recursive: true });
  const context = await browser.newContext({
    viewport: SCREEN, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: opts.theme ?? 'dark', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    baseURL: 'http://localhost:4173', serviceWorkers: 'block'
  });
  await context.route(url => url.pathname === '/' || url.pathname.endsWith('/index.html'), async route => {
    const res = await route.fetch();
    const html = (await res.text()).replace(/width=device-width, initial-scale=1\.0/, `width=${VIEWPORT.width}`);
    await route.fulfill({ response: res, body: html });
  });
  await context.clock.install({ time: NOW });
  await context.clock.resume();
  await context.addInitScript(TOUCH_SCRIPT);

  // 1) carrega os dados pelo próprio "Restaurar" do app
  const loader = await context.newPage();
  const file = join(tmpdir(), `video-${name}.json`);
  writeFileSync(file, JSON.stringify(buildBackup(data, pkg.version, NOW)));
  await loader.goto('/');
  await loader.getByRole('button', { name: 'Perfil', exact: true }).click();
  loader.on('dialog', d => d.accept());
  await loader.getByLabel('Arquivo de backup').setInputFiles(file);
  await loader.getByRole('button', { name: /^Substituir tudo pelo backup/ }).click();
  await expect(loader.getByRole('status').filter({ hasText: 'Backup restaurado' })).toBeVisible();
  await loader.waitForTimeout(600); // o app salva 250 ms depois
  await loader.close();

  // 2) a cena
  const page = await context.newPage();
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'quadros'), { recursive: true });
  const frames: { file: string; t: number }[] = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `${String(frames.length).padStart(5, '0')}.jpg`;
    writeFileSync(join(dir, 'quadros', file), Buffer.from(data, 'base64'));
    frames.push({ file, t: (metadata.timestamp ?? Date.now() / 1000) - t0 / 1000 });
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const t0 = Date.now();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  const markers: Marker[] = [];
  const mark = (type: Marker['type'], text?: string) => { markers.push({ t: (Date.now() - t0) / 1000, type, ...(text ? { text } : {}) }); };
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Início', exact: true })).toBeVisible();
  // as conquistas que a restauração liberou não entram no vídeo
  await expect(page.getByText(/Conquista desbloqueada/)).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(400);
  mark('caption', '__start__');

  const scene: Scene = {
    page,
    async tap(target, { before = 450, after = 700 } = {}) {
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(before);
      mark('tap');
      await target.click();
      await page.waitForTimeout(after);
    },
    async type(target, text) {
      await target.click();
      mark('type');
      await target.pressSequentially(text, { delay: 110 });
      await page.waitForTimeout(400);
    },
    caption: text => mark('caption', text),
    mark,
    wait: ms => page.waitForTimeout(ms),
    async scroll(dy, ms = 900) {
      // a roda rola o que estiver sob o ponteiro (a página ou o painel aberto)
      await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height * 0.55);
      const steps = Math.max(1, Math.round(ms / 16));
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await page.waitForTimeout(16); }
      await page.waitForTimeout(250);
    }
  };
  await body(scene);
  await page.waitForTimeout(500);
  mark('end');
  await cdp.send('Page.stopScreencast');
  await context.close();
  writeFileSync(join(dir, 'quadros.json'), JSON.stringify(frames));
  writeFileSync(join(dir, 'momentos.json'), JSON.stringify(markers, null, 2));
}
