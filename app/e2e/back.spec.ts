import { expect, test } from '@playwright/test';

test('voltar: fecha o painel, depois volta para o Início', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Segunda' }).click();
  await expect(page.getByRole('dialog', { name: 'Segunda' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Plano', level: 1 })).toBeVisible();

  // painel fechado pelo X não deixa entrada sobrando
  await page.getByRole('button', { name: 'Editar Segunda' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goBack();
  await expect(page.getByRole('button', { name: 'Início', exact: true })).toHaveAttribute('aria-current', 'page');
});
