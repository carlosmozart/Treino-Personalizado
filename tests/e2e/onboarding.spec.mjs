import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { test, expect } from '@playwright/test';

const root = process.cwd();
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
let server;
let baseUrl;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = resolve(root, relative);
    if (!file.startsWith(`${root}${sep}`) && file !== resolve(root, 'index.html')) {
      response.writeHead(403).end();
      return;
    }
    try {
      response.writeHead(200, { 'content-type': mimeTypes[extname(file)] || 'application/octet-stream' });
      response.end(await readFile(file));
    } catch (_) {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolveServer => server.close(resolveServer)));

test('onboarding leva a uma tela de treino utilizável', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator('#onboardingOverlay')).toBeVisible();
  await expect(page.locator('#appVersion')).not.toHaveText('');
  await page.locator('#onbName').fill('Pessoa Teste');
  await page.locator('#onbBirthdate').fill('1995-09-19');
  await page.locator('#onbHeight').fill('175');
  await page.locator('#onbWeight').fill('70');
  await page.getByRole('button', { name: 'Começar' }).click();

  await expect(page.locator('#onboardingOverlay')).toBeHidden();
  await expect(page.locator('#workoutSelect')).toBeVisible();
  await expect(page.locator('#restSoundToggle')).toHaveAttribute('aria-pressed', /true|false/);
});
