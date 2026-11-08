import { expect, test } from '@playwright/test';

test('séries da semana contra a faixa (V3) e resumo da semana no Início (V4)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 4, 18)); // quarta
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const card = page.getByRole('article').first();
  await card.getByRole('textbox', { name: 'Carga da série 1' }).fill('40');
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await card.getByRole('button', { name: 'Série 2 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // V3: o cartão conta as 2 séries da semana; a faixa pode mudar
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  const weekly = page.getByRole('region', { name: 'Séries da semana' });
  await expect(weekly.getByRole('listitem', { name: /: 2 séries, faixa de \d+ a \d+, faltam \d+$/ })).toHaveCount(1);
  await weekly.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/series-semana.png' });
  await weekly.getByRole('button', { name: 'Faixas' }).click();
  await page.getByRole('textbox', { name: 'Mínimo de Peito' }).fill('12');
  await page.getByRole('switch', { name: /^Mostrar no Início/ }).check();
  await page.keyboard.press('Escape');
  await expect(weekly.getByRole('listitem', { name: /^Peito: 0 séries, faixa de 12 a 20/ })).toBeVisible();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Esta semana, mais espaço em / })).toBeVisible();
  await page.waitForTimeout(400);

  // V4: na segunda seguinte, o resumo da semana que passou
  await page.clock.setFixedTime(new Date(2026, 10, 9, 9));
  await page.reload();
  const recap = page.getByRole('region', { name: 'Sua semana: 2 a 8 de nov.' });
  await expect(recap).toContainText('Treinos1');
  await recap.screenshot({ path: 'test-results/resumo-semana.png' });
  const [download] = await Promise.all([page.waitForEvent('download'), recap.getByRole('button', { name: 'Compartilhar' }).click()]);
  expect(download.suggestedFilename()).toBe('resumo-semana-2026-11-02.png');
  await download.saveAs('test-results/resumo-semana-imagem.png');
  await recap.getByRole('button', { name: 'Fechar o resumo da semana' }).click();
  await expect(recap).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Sua semana: 2 a 8 de nov.' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
