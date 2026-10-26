import { expect, test } from '@playwright/test';

test('Halloween: aranha, gatinho, abóbora, lua, versão calma no treino e desligar', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 9, 26, 19));
  await page.goto('/');

  // ao abrir, a aranha desce da teia e o fundo e o destaque viram de abóbora
  const spider = page.getByRole('button', { name: 'Aranha' });
  await expect(spider).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-season', 'halloween');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#c2410c');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'test-results/halloween-inicio.png' });
  await spider.click();
  await expect(spider).toBeHidden();

  // o gatinho de chapéu mia
  await page.getByRole('button', { name: 'Gatinho de bruxa' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Miau|Prrr/ })).toBeVisible();

  // a abóbora escondida dá a surpresa uma vez por dia
  await page.getByRole('button', { name: 'Abóbora escondida' }).click();
  await expect(page.getByRole('status').filter({ hasText: '🎃' })).toBeVisible();
  await page.screenshot({ path: 'test-results/halloween-abobora.png' });
  await expect(page.getByRole('button', { name: 'Abóbora escondida' })).toBeHidden({ timeout: 8000 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Gatinho de bruxa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abóbora escondida' })).toHaveCount(0);

  // Progresso: a lua
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'test-results/halloween-progresso.png' });

  // no treino, só uma abóbora parada: sem gatinho, sem aranha
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await expect(page.getByTestId('halloween')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gatinho de bruxa' })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/halloween-treino.png' });
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.screenshot({ path: 'test-results/halloween-resumo.png' });
  await page.getByRole('button', { name: 'Fechar' }).click();

  // Perfil → Aparência → Temas de época → Desligado: tudo some e o azul volta
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  const choice = page.getByRole('radiogroup', { name: 'Temas de época' });
  await choice.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/halloween-ajustes.png' });
  await choice.getByRole('radio', { name: 'Desligado' }).click();
  await expect(page.getByTestId('halloween')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-season', 'halloween');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#2563eb');
  expect(errors).toEqual([]);
});

test('Halloween: fora da época não aparece; "Sempre" liga; reduzir movimento deixa tudo parado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(2026, 10, 1, 10));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByTestId('halloween')).toHaveCount(0);

  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Temas de época' }).getByRole('radio', { name: 'Sempre' }).click();
  await expect(page.getByTestId('halloween')).toBeVisible();
  await page.getByRole('switch', { name: 'Cores de abóbora' }).uncheck();
  await expect(page.locator('html')).not.toHaveAttribute('data-season', 'halloween');

  // parado: sem morcegos, e a aranha aparece já pendurada ao voltar para o Início
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Aranha' })).toBeVisible();
  await expect(page.locator('.hw-flight')).toHaveCount(0);
});

test('Halloween no tema escuro: bichos com contorno claro sobre o fundo arroxeado', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.clock.setFixedTime(new Date(2026, 9, 31, 21));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Aranha' })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(9, 6, 13)');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'test-results/halloween-escuro.png' });
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.waitForTimeout(4200);
  await page.screenshot({ path: 'test-results/halloween-escuro-progresso.png' });
});
