import { expect, test, type Page } from '@playwright/test';

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);
}

test('setas contra a última vez (V1) e nota em cada série (V2), no treino e no histórico', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 3, 18)); // terça
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  let card = page.getByRole('article').first();
  await card.getByRole('textbox', { name: 'Carga da série 1' }).fill('40');
  await card.getByRole('textbox', { name: 'Carga da série 2' }).fill('40');
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await card.getByRole('button', { name: 'Série 2 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  // na primeira vez não há com o que comparar
  await expect(card.getByRole('img', { name: /última vez/ })).toHaveCount(0);
  await finish(page);

  // uma semana depois, o mesmo treino
  await page.clock.setFixedTime(new Date(2026, 10, 10, 18));
  await page.reload();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  card = page.getByRole('article').first();
  await card.getByRole('textbox', { name: 'Carga da série 1' }).fill('42,5');
  await card.getByRole('textbox', { name: 'Carga da série 2' }).fill('40');
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await card.getByRole('button', { name: 'Série 2 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(card.getByRole('img', { name: /^Série 1: Mais que da última vez \(40 kg × \d+\)$/ })).toBeVisible();
  await expect(card.getByRole('img', { name: /^Série 2: Igual à última vez/ })).toBeVisible();

  // o número abre o menu: nota e até a falha
  await card.getByRole('button', { name: 'Série 2: opções' }).click();
  await expect(page.getByText(/^Última vez: 40 kg × \d+ reps$/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Nota da série' }).fill('senti o ombro');
  await page.screenshot({ path: 'test-results/serie-menu.png' });
  await page.getByRole('button', { name: 'Salvar nota' }).click();
  await expect(card.getByRole('button', { name: 'Nota da série 2: senti o ombro. Mudar' })).toBeVisible();
  await card.getByRole('button', { name: 'Série 1: opções' }).click();
  await page.getByRole('button', { name: 'Marcar como até a falha' }).click();
  await expect(card.getByRole('button', { name: 'Série 1: opções, até a falha' })).toHaveText('F');
  await card.screenshot({ path: 'test-results/serie-setas.png' });
  await finish(page);

  // histórico: as setas contra o treino anterior e a nota
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await page.getByRole('button', { name: /^10/ }).first().click();
  await expect(page.getByText('✎ Série 2: senti o ombro')).toBeVisible();
  await expect(page.getByText('↑').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/serie-historico.png' });

  // a opção desliga as setas
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: /^Comparar cada série com a última vez/ }).uncheck();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  if (!(await page.getByText('✎ Série 2: senti o ombro').isVisible())) await page.getByRole('button', { name: /^10/ }).first().click();
  await expect(page.getByText('↑')).toHaveCount(0);
  await expect(page.getByText('✎ Série 2: senti o ombro')).toBeVisible();
  expect(errors).toEqual([]);
});
