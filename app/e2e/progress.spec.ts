import { expect, test } from '@playwright/test';

test('progresso: estatísticas, mapa de calor e histórico com apagar', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.getByText('Nenhum treino registrado ainda.', { exact: false })).toBeVisible();

  // um treino curto
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: 'Finalizar assim' }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByText('Treinos', { exact: true }).locator('..')).toContainText('1');
  await expect(page.getByRole('img', { name: /1 dia treinado/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/progresso.png', fullPage: true });

  await page.getByRole('tab', { name: 'Histórico' }).click();
  const item = page.getByRole('listitem').filter({ hasText: '1 exercício' }).first();
  await item.getByRole('button').first().click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Apagar treino' }).click();
  await expect(page.getByText('Nenhum treino registrado ainda.', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
