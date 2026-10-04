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

test('metas: conquista do primeiro check-in e meta de peso com marcos', async ({ page }) => {
  // meio-dia: à noite também sairia a conquista do check-in noturno
  await page.clock.setFixedTime(new Date(2026, 9, 7, 12));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /presença/ }).click();
  await expect(page.getByText('Conquista desbloqueada: Primeiro Passo')).toBeVisible();
  await page.getByRole('button', { name: /Registrar/ }).click();
  await page.getByRole('textbox', { name: 'Peso de hoje em kg' }).fill('90');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  await expect(page.getByTestId('conquistas')).toHaveText('1/28');
  await page.getByRole('button', { name: 'Definir meta' }).click();
  await page.getByRole('textbox', { name: 'Peso desejado em kg' }).fill('82');
  await page.getByRole('button', { name: 'Começar meta' }).click();
  await expect(page.getByText('faltam 8 kg')).toBeVisible();
  await expect(page.getByText('88 kg', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/metas.png', fullPage: true });
});

test('histórico: corrigir um exercício, evolução e apagar pesagem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();
  const name = await first.getAttribute('aria-label');
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: 'Finalizar assim' }).click();

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Evolução por exercício' })).toBeVisible();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await page.getByRole('listitem').filter({ hasText: '1 exercício' }).first().getByRole('button').first().click();
  await page.getByRole('button', { name: `Corrigir ${name}` }).click();
  await page.getByRole('textbox', { name: 'Carga da série 1' }).fill('77,5');
  await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByRole('button', { name: `Corrigir ${name}` })).toContainText('77,5kg');

  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /Registrar/ }).click();
  await page.getByRole('textbox', { name: 'Peso de hoje em kg' }).fill('91');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: /^Apagar pesagem de / }).first().click();
  await expect(page.getByRole('heading', { name: 'Pesagens' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
