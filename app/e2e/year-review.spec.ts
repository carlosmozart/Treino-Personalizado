import { expect, test, type Page } from '@playwright/test';

/** Um treino curto no dia e hora dados: uma série marcada e finalizar. */
async function train(page: Page, when: Date, weight: string) {
  await page.clock.setFixedTime(when);
  await page.reload();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();
  await first.getByRole('textbox', { name: 'Carga da série 1' }).fill(weight);
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);
}

test('retrospectiva do ano (V6): cartão em dezembro, telas, compartilhar e no Progresso', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 2, 2, 7));
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.waitForTimeout(400); // a gravação é adiada um instante: espera antes de recarregar
  await train(page, new Date(2026, 2, 2, 7), '40');
  await train(page, new Date(2026, 2, 9, 7), '45');
  await train(page, new Date(2026, 5, 1, 7), '50');

  // fora de dezembro e janeiro, sem cartão no Início
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Retrospectiva 2026' })).toHaveCount(0);

  await page.clock.setFixedTime(new Date(2026, 11, 10, 10));
  await page.reload();
  const card = page.getByRole('region', { name: 'Retrospectiva 2026' });
  await expect(card).toContainText('Seu 2026 está pronto');
  await card.screenshot({ path: 'test-results/retro-cartao.png' });
  await card.getByRole('button', { name: 'Ver a retrospectiva' }).click();

  const story = page.getByRole('dialog', { name: 'Retrospectiva 2026' });
  await expect(story).toContainText('Seu ano de treino');
  await story.getByRole('button', { name: 'Próxima tela' }).click();
  await expect(story).toContainText('treinos em 3 dias diferentes.');
  await page.screenshot({ path: 'test-results/retro-treinos.png' });
  // compartilhar: no navegador vira download do PNG
  const [download] = await Promise.all([page.waitForEvent('download'), story.getByRole('button', { name: 'Compartilhar esta tela' }).click()]);
  expect(download.suggestedFilename()).toBe('retrospectiva-2026-treinos.png');
  await download.saveAs('test-results/retro-imagem.png');
  // vai até o fim
  for (let i = 0; i < 12 && await story.getByRole('button', { name: 'Próxima tela' }).isEnabled(); i++) {
    await story.getByRole('button', { name: 'Próxima tela' }).click();
  }
  await expect(story).toContainText('Que ano!');
  await page.screenshot({ path: 'test-results/retro-resumo.png' });
  await story.getByRole('button', { name: 'Tela anterior' }).click();
  await page.screenshot({ path: 'test-results/retro-jeito.png' });
  await story.getByRole('button', { name: 'Fechar a retrospectiva' }).click();
  await expect(story).toHaveCount(0);

  // o × esconde o cartão no ano; o Progresso continua com a retrospectiva
  await card.getByRole('button', { name: 'Esconder a retrospectiva' }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('button', { name: 'Ver 2026' }).click();
  await expect(page.getByRole('dialog', { name: 'Retrospectiva 2026' })).toBeVisible();
  // o voltar do Android (histórico do navegador) fecha a retrospectiva
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Retrospectiva 2026' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
