import { expect, test } from '@playwright/test';

test('ganhos rápidos: aba volta ao topo, YouTube, volume ao vivo e total levantado', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 3, 18));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();

  // T20: o volume aparece no cabeçalho conforme as séries são marcadas
  const card = page.getByRole('article').first();
  await card.getByRole('textbox', { name: 'Carga da série 1' }).fill('40');
  await card.getByRole('textbox', { name: 'Reps da série 1' }).fill('10');
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByText(/1\/\d+ séries · 400 kg/)).toBeVisible();
  await page.screenshot({ path: 'test-results/volume-ao-vivo.png' });

  // V12: o menu do exercício busca a execução no YouTube
  await card.getByRole('button', { name: /^Opções de / }).click();
  const yt = page.getByRole('link', { name: 'Ver a execução no YouTube' });
  await expect(yt).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/results\?search_query=.+%20execu%C3%A7%C3%A3o$/);
  await expect(yt).toHaveAttribute('target', '_blank');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // T19: total levantado no Progresso
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByText('Total levantado')).toBeVisible();
  await expect(page.getByText('Total levantado').locator('..')).toContainText('400 kg');
  await page.getByText('Total levantado').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/total-levantado.png' });

  // V11: tocar na aba em que já está volta ao topo
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(errors).toEqual([]);
});
