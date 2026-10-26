import { expect, test } from '@playwright/test';

test('rotação com descanso e treino repetido (T14) e "Novo neste treino" (T13)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 3, 10)); // terça, fora da época do Halloween
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('radio', { name: 'Rotação A/B/C' }).click();

  // T14: descanso depois do A e o B repetido no fim
  const volta = page.getByRole('list', { name: 'Ordem da volta' });
  const before = await volta.getByRole('listitem').count();
  await page.getByRole('button', { name: '+ Descanso' }).click();
  await page.getByRole('button', { name: 'Repetir o treino B na volta' }).click();
  await expect(volta.getByRole('listitem')).toHaveCount(before + 2);
  for (let i = before + 1; i > 2; i--) await page.getByRole('button', { name: `Subir o ${i}º da volta` }).click();
  await expect(volta.getByRole('listitem').nth(1)).toContainText('Descanso');
  await expect(volta.getByRole('listitem').last()).toContainText(/^\d+\. B · /);
  // o único A não sai; o B repetido sai
  await expect(page.getByRole('button', { name: 'Tirar o 1º da volta' })).toBeDisabled();
  await expect(page.getByRole('button', { name: `Tirar o ${before + 2}º da volta` })).toBeEnabled();
  await page.screenshot({ path: 'test-results/rotacao-volta.png', fullPage: true });

  // T13: treino A com um exercício acrescentado
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Adicionar exercício' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para adicionar' }).fill('Rosca Teste');
  await page.getByRole('button', { name: 'Usar “Rosca Teste”' }).click();
  await page.getByRole('article', { name: 'Rosca Teste' }).getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();

  const novo = page.getByRole('region', { name: 'Novo neste treino' });
  await expect(novo).toContainText('Rosca Teste');
  await novo.getByRole('button', { name: 'Adicionar Rosca Teste ao plano' }).click();
  await expect(novo.getByText('No plano')).toBeVisible();
  await expect(page.getByText(/depois de 1 dia de descanso/)).toBeVisible();
  await page.screenshot({ path: 'test-results/novo-neste-treino.png', fullPage: true });
  await page.getByRole('button', { name: 'Fechar' }).click();

  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Treino A' })).toContainText('Rosca Teste');

  // no dia seguinte, descanso da volta, com o B à mão
  await page.waitForTimeout(400);
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Descanso da rotação' })).toBeVisible();
  await page.screenshot({ path: 'test-results/rotacao-descanso.png' });
  await page.getByRole('button', { name: 'Treinar mesmo assim: treino B' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/B|Pull|Costas/);
  expect(errors).toEqual([]);
});
