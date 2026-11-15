import { expect, test } from '@playwright/test';

test('barra do treino com uma marca por série e anel no descanso', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const ticks = page.getByTestId('marcas-de-series').locator('span');
  const total = Number(/\/(\d+) séries/.exec((await page.getByText(/\d+\/\d+ séries/).first().textContent())!)![1]);
  await expect(ticks).toHaveCount(total);
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(ticks.first()).toHaveClass(/bg-success/);
  await expect(ticks.nth(1)).not.toHaveClass(/bg-success/);
  const rest = page.getByRole('timer', { name: 'Descanso' });
  await expect(rest.locator('svg circle')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/anel-e-marcas.png' });
});
