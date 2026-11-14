import { expect, test, type Page } from '@playwright/test';

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);
}

test('montar o treino de hoje pelos grupos e juntar dois nomes do mesmo exercício (W7, V10)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 18, 18));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Montar o treino de hoje pelos grupos' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Peito', exact: true }).click();
  await sheet.getByRole('button', { name: 'Costas', exact: true }).click();
  await expect(sheet.getByTestId('treino-montado')).toContainText('5 exercícios');
  await sheet.getByRole('radio', { name: '20 min' }).click();
  await expect(sheet.getByTestId('treino-montado')).toContainText('3 exercícios');
  await page.screenshot({ path: 'test-results/montar-treino.png' });
  await sheet.getByRole('button', { name: 'Começar este treino' }).click();
  await expect(page.getByRole('heading', { name: 'Treino do dia: Peito, Costas' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);

  // um nome digitado à mão para o supino
  await page.getByRole('button', { name: 'Adicionar exercício' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para adicionar' }).fill('Supino da academia');
  await page.getByRole('button', { name: 'Usar “Supino da academia”' }).click();
  await page.getByRole('article', { name: 'Supino da academia' }).getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await finish(page);

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('combobox', { name: 'Exercício' }).selectOption({ label: 'Supino da academia (1)' });
  await page.getByRole('button', { name: 'Juntar com outro exercício' }).click();
  await page.getByRole('textbox', { name: 'Juntar com' }).fill('supino reto barra');
  await page.getByRole('button', { name: 'Supino Reto (Barra)', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('1 treino (1 série) passa para “Supino Reto (Barra)”');
  await page.screenshot({ path: 'test-results/juntar-exercicios.png' });
  await page.getByRole('button', { name: 'Juntar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'agora é' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Exercício' })).toHaveValue('supino reto (barra)');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('combobox', { name: 'Exercício' })).toHaveValue('supino da academia');
  expect(errors).toEqual([]);
});

test('outros nomes na busca e números de exercício novo (T16, W14)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Séries de exercício novo' }).fill('2');
  await page.getByRole('textbox', { name: 'Repetições de exercício novo' }).fill('8');
  // com o teclado aberto a barra de abas some: sai do campo
  await page.getByRole('textbox', { name: 'Repetições de exercício novo' }).blur();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero' }).click();
  await page.getByRole('button', { name: 'Criar plano e adicionar exercícios' }).click();

  // apelido na biblioteca
  await page.getByRole('button', { name: 'Biblioteca' }).click();
  await page.getByRole('textbox', { name: 'Buscar na biblioteca' }).fill('supino reto barra');
  await page.getByRole('button', { name: /^Supino Reto \(Barra\)/ }).first().click();
  await page.getByRole('textbox', { name: 'Outros nomes (para a busca)' }).fill('bench press');
  await page.getByRole('button', { name: 'Salvar os nomes' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();

  const monday = page.getByRole('article', { name: 'Segunda' });
  await monday.getByRole('button', { name: 'Adicionar exercício' }).click();
  await page.getByRole('textbox', { name: 'Nome do exercício' }).fill('bench');
  await page.getByRole('button', { name: /Supino Reto \(Barra\)/ }).first().click();
  await page.getByRole('button', { name: /^Pronto/ }).click();
  await expect(monday.getByText(/^2 × 8/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('nenhuma aba passa da largura do celular', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  for (const tab of ['Início', 'Plano', 'Treino', 'Progresso', 'Perfil']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll, `aba ${tab}`).toBeLessThanOrEqual(width);
  }
});
