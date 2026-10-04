import { expect, test } from '@playwright/test';

test('treino completo: plano de exemplo, marcar séries, descanso, sobreviver ao recarregar e finalizar', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();

  // começa o primeiro dia da lista (hoje)
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();
  await expect(first.getByText('Série')).toBeVisible();
  await page.screenshot({ path: 'test-results/treino-ativo.png', fullPage: false });

  await first.getByRole('textbox', { name: 'Carga da série 1' }).fill('42,5');
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(first.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByText(/1\/\d+ séries/)).toBeVisible();

  // o treino em andamento sobrevive a recarregar a página
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  const again = page.getByRole('article').first();
  await expect(again.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  await expect(again.getByRole('textbox', { name: 'Carga da série 1' })).toHaveValue('42,5');

  // menu ⋯: marcar todas as séries
  await again.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Marcar todas as séries' }).click();

  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByText(/Treino incompleto/)).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar assim' }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await expect(page.getByText('Check-in feito: +50 XP (meio, treino incompleto)')).toBeVisible();
  await page.screenshot({ path: 'test-results/treino-resumo.png' });
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('1 treino no histórico.');
  expect(errors).toEqual([]);
});
