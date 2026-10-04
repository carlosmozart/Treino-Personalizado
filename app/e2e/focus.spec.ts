import { expect, test } from '@playwright/test';

test('modo foco: um exercício por vez, navegação e preferência lembrada; aquecimento', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('button', { name: 'Um exercício por vez' }).click();
  await expect(page.getByText(/^Exercício 1\/\d+$/)).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);

  // aquecimento entra antes das séries de trabalho
  const card = page.getByRole('article');
  await card.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Adicionar série de aquecimento' }).click();
  await expect(card.getByTitle('Aquecimento')).toHaveCount(1);

  await page.getByRole('button', { name: 'Próximo exercício' }).click();
  await expect(page.getByText(/^Exercício 2\/\d+$/)).toBeVisible();
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ver todos os exercícios' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos os exercícios' }).click();
  await expect(page.getByRole('article').nth(1)).toBeVisible();
});
