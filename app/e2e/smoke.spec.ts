import { expect, test } from '@playwright/test';

test('abre sem erros, navega pelas abas e não acessa nada fora do app', async ({ page }) => {
  const erros: string[] = [];
  const externas: string[] = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('request', r => {
    const url = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'data:') externas.push(r.url());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Início');
  // banco novo criado na primeira abertura, sem dados do app antigo
  await expect(page.getByRole('status')).toHaveText('0 treinos no histórico.');
  for (const aba of ['Plano', 'Treino', 'Progresso', 'Perfil', 'Início']) {
    await page.getByRole('button', { name: aba, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(aba);
  }
  await expect(page.getByText(/Treino Personalizado v\d+\.\d+\.\d+/)).toBeVisible();

  // a barra inferior não pode empurrar a página para os lados no celular
  const larguraExtra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(larguraExtra).toBeLessThanOrEqual(0);

  expect(erros).toEqual([]);
  expect(externas).toEqual([]);
});

test('instala o service worker e continua abrindo sem rede', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload(); // a partir daqui a página é controlada pelo service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Início');
  await context.setOffline(false);
});
