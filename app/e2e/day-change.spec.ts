import { expect, test } from '@playwright/test';

test('virada de dia com o app aberto: o Início passa para o novo dia', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 6, 23, 59) }); // terça, 23h59
  await page.goto('/');
  await expect(page.getByRole('listitem', { name: /^Terça 6.*, hoje$/ })).toBeVisible();
  await page.clock.fastForward('02:00');
  await expect(page.getByRole('listitem', { name: /^Quarta 7.*, hoje$/ })).toBeVisible();
});
