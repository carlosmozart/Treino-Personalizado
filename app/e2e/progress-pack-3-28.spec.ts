import { expect, test, type Page } from '@playwright/test';

async function scratchPlan(page: Page, name: string, kg: string) {
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero' }).click();
  await page.getByRole('button', { name: 'Criar plano e adicionar exercícios' }).click();
  const monday = page.getByRole('article', { name: 'Segunda' });
  await monday.getByRole('button', { name: 'Adicionar exercício' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('textbox', { name: 'Nome do exercício' }).fill(name);
  await sheet.getByRole('button', { name }).first().click();
  await sheet.getByRole('button', { name: /^Pronto/ }).click();
  await monday.getByRole('textbox', { name: `Carga (kg) de ${name}` }).fill(kg);
  await page.waitForTimeout(400);
}

async function weighIn(page: Page, date: string, label: RegExp, kg: string) {
  await page.getByRole('button', { name: 'Registrar peso' }).click();
  await page.getByLabel('Data da pesagem').fill(date);
  await page.getByRole('textbox', { name: label }).fill(kg);
  await page.getByRole('button', { name: 'Salvar' }).click();
}

test('desafios do mês, nível de força, recordes por repetição e ritmo do peso (V7, V9, W16, T15)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18)); // segunda
  await page.goto('/');
  // peso: três pesagens em três semanas, descendo
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await weighIn(page, '2026-11-01', /^Peso de 1 .* em kg$/, '82');
  await weighIn(page, '2026-11-08', /^Peso de 8 .* em kg$/, '81,4');
  await weighIn(page, '2026-11-15', /^Peso de 15 .* em kg$/, '80,9');

  await scratchPlan(page, 'Supino Reto (Barra)', '80');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const card = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  const challenges = page.getByRole('region', { name: 'Desafios do mês' });
  await expect(challenges.getByRole('heading', { name: 'Desafios de novembro' })).toBeVisible();
  await expect(challenges.getByRole('listitem')).toHaveCount(3);
  await expect(challenges).toContainText('8 dias de treino em novembro');
  await challenges.screenshot({ path: 'test-results/desafios-do-mes.png' });

  // 80 × 10 com 80,9 kg de corpo: 1RM ~107 kg = 1,32×: Intermediário
  await expect(page.getByTestId('nivel-de-forca')).toContainText('Nível de força: Intermediário');
  await page.getByText('Recordes por repetição').click();
  await expect(page.getByRole('row', { name: /^10 80 kg/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^11 ~.* estimado$/ })).toBeVisible();
  await page.getByTestId('nivel-de-forca').screenshot({ path: 'test-results/nivel-de-forca.png' });

  await page.getByRole('tab', { name: 'Metas' }).click();
  await expect(page.getByTestId('ritmo-do-peso')).toContainText('kg por semana');
  await expect(page.getByTestId('ritmo-do-peso')).toContainText('descendo');
  expect(errors).toEqual([]);
});

test('menos movimento e treino esquecido em outra aba, salvo sozinho e reaberto (W18, W4)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.install({ time: new Date(2026, 10, 16, 18) });
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Menos movimento (sem animações nem neve)' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');

  await scratchPlan(page, 'Supino Reto (Barra)', '60');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article', { name: 'Supino Reto (Barra)' }).getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  // vai para o Progresso e esquece o treino aberto
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.clock.fastForward('46:00');
  await expect(page.getByRole('heading', { name: 'Ainda treinando?' })).toBeVisible();
  await page.clock.fastForward('05:30');
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: 'Salvo sozinho' })).toBeVisible();
  await page.screenshot({ path: 'test-results/salvo-sozinho.png' });

  // reabrir: as séries voltam marcadas
  await page.getByRole('button', { name: 'Reabrir o treino' }).click();
  const card = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  await expect(card.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  // as séries do plano que faltavam voltam para fazer
  await expect(card.getByRole('button', { name: 'Série 3 feita' })).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
