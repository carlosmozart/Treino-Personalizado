import { expect, test } from '@playwright/test';

test('Natal: cores, azevinho, gatinho de gorro, presente escondido e calendário do advento', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 11, 8, 19));
  await page.goto('/');

  await expect(page.getByTestId('natal')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-season', 'natal');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#b91c1c');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/natal-inicio.png' });

  // calendário do advento: a porta de hoje abre; as do futuro ficam fechadas
  const advent = page.getByRole('region', { name: 'Calendário do advento' });
  await expect(advent).toContainText('Faltam 17 dias para o Natal.');
  await advent.getByRole('button', { name: 'Abrir a porta de hoje (8)' }).click();
  await expect(page.getByRole('heading', { name: /^Porta 8 · / })).toBeVisible();
  await page.screenshot({ path: 'test-results/natal-porta.png' });
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await expect(advent.getByRole('button', { name: 'Ver a porta 8 de novo' })).toBeVisible();
  await advent.getByRole('button', { name: 'Ver as 24 portas' }).click();
  await expect(advent.getByRole('button', { name: 'Porta 9, abre no dia 9' })).toBeDisabled();
  await expect(advent.getByRole('button', { name: 'Porta 8, aberta' })).toBeVisible();
  await advent.getByRole('button', { name: 'Porta 3, esperando você' }).click();
  await expect(page.getByRole('heading', { name: /^Porta 3 · Desafio/ })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await advent.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/natal-calendario.png' });

  // gatinho de gorro e presente escondido
  await page.getByRole('button', { name: 'Gatinho de gorro' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Miau|Ho ho|Prrr/ })).toBeVisible();
  await page.getByRole('button', { name: 'Presente escondido' }).click();
  await expect(page.getByRole('status').filter({ hasText: '🎁' })).toBeVisible();
  await page.screenshot({ path: 'test-results/natal-presente.png' });

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(4200);
  await page.screenshot({ path: 'test-results/natal-progresso.png' });

  // no treino, só um presente parado
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await expect(page.getByTestId('natal')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gatinho de gorro' })).toHaveCount(0);
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.screenshot({ path: 'test-results/natal-resumo.png' });
  expect(errors).toEqual([]);
});

test('Natal no escuro, e depois do dia 24 o calendário sai mas o tema fica até o fim do ano', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.clock.setFixedTime(new Date(2026, 11, 20, 21));
  await page.goto('/');
  await expect(page.getByTestId('natal')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(5, 11, 8)');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/natal-escuro.png' });

  await page.clock.setFixedTime(new Date(2026, 11, 26, 10));
  await page.reload();
  await expect(page.getByTestId('natal')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Calendário do advento' })).toHaveCount(0);
  await page.clock.setFixedTime(new Date(2027, 0, 2, 10));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByTestId('natal')).toHaveCount(0);
});
