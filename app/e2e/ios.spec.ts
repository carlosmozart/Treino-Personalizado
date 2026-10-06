import { expect, test } from '@playwright/test';

test.describe('no iPhone pelo navegador', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });

  test('ensina a adicionar à Tela de Início, e "Agora não" esconde de vez', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Instalar no iPhone' });
    await expect(notice).toContainText('Adicionar à Tela de Início');
    await page.screenshot({ path: 'test-results/ios-instalar.png' });
    await notice.getByRole('button', { name: 'Agora não' }).click();
    await expect(notice).toBeHidden();
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Instalar no iPhone' })).toBeHidden();
  });
});

test('fora do iPhone o aviso não aparece', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Instalar no iPhone' })).toHaveCount(0);
});
