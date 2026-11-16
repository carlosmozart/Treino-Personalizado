import { expect, test } from '@playwright/test';

test('o cronômetro da prancha não passa para o treino seguinte', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 16, 10) });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Em casa 3×' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const plank = page.getByRole('article', { name: 'Prancha Isométrica' });
  await plank.getByRole('button', { name: /^Começar a série 1/ }).click();
  await expect(page.getByRole('timer', { name: 'Cronômetro de Prancha Isométrica' })).toBeVisible();
  // pausar encerra a contagem
  await page.getByRole('button', { name: 'Pausar o treino' }).click();
  await expect(page.getByRole('timer', { name: 'Cronômetro de Prancha Isométrica' })).toHaveCount(0);
  await page.getByRole('region', { name: 'Treino pausado' }).getByRole('button', { name: 'Continuar' }).click();
  // cancelar o treino com o cronômetro rodando e começar outro
  await plank.getByRole('button', { name: /^Começar a série 1/ }).click();
  await page.getByRole('button', { name: 'Trocar ou cancelar treino' }).click();
  await page.getByRole('button', { name: 'Cancelar treino', exact: true }).click();
  await page.clock.fastForward('02:00');
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.clock.fastForward('00:05');
  await expect(plank.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('timer')).toHaveCount(0);
});

test('Sobre com os atalhos separados e a calculadora de 1RM numa linha', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18));
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  const news = await page.getByRole('button', { name: 'Novidades' }).boundingBox();
  const credits = await page.getByRole('button', { name: 'Créditos e licenças' }).boundingBox();
  expect(credits!.x - (news!.x + news!.width)).toBeGreaterThanOrEqual(12);

  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  const field = await page.getByRole('textbox', { name: 'Repetições para a calculadora' }).boundingBox();
  expect(field!.width).toBeLessThan(90);
});
