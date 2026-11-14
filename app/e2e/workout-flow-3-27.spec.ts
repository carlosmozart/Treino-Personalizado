import { expect, test, type Page } from '@playwright/test';

/** Plano do zero (segunda, quarta e sexta) com os exercícios dados em cada dia; carga de todos em `kg`. */
async function scratchPlan(page: Page, days: Record<string, string[]>, kg: string) {
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero' }).click();
  await page.getByRole('button', { name: 'Criar plano e adicionar exercícios' }).click();
  for (const [day, names] of Object.entries(days)) {
    const card = page.getByRole('article', { name: day });
    for (const n of names) {
      await card.getByRole('button', { name: 'Adicionar exercício' }).click();
      const sheet = page.getByRole('dialog');
      await sheet.getByRole('textbox', { name: 'Nome do exercício' }).fill(n);
      await sheet.getByRole('button', { name: n }).first().click();
      await sheet.getByRole('button', { name: /^Pronto/ }).click();
      await card.getByRole('textbox', { name: `Carga (kg) de ${n}` }).fill(kg);
    }
  }
  await page.waitForTimeout(400);
}

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);
}

test('prévia antes de começar, recorde na hora com quanto falta, e pausar o treino (W11, W8, W3)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18)); // segunda
  await page.goto('/');
  await scratchPlan(page, { Segunda: ['Supino Reto (Barra)'] }, '60');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  let card = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  // primeira vez: nada a comparar, sem troféu nem dica
  await expect(card.getByTestId('dica-recorde')).toHaveCount(0);
  await finish(page);

  // uma semana depois, com a prévia ligada
  await page.clock.setFixedTime(new Date(2026, 10, 23, 18));
  await page.reload();
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Abrir o treino numa prévia, com Começar embaixo' }).check();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const preview = page.getByRole('region', { name: 'Prévia do treino' });
  await expect(preview).toContainText('Supino Reto (Barra)');
  await expect(preview).toContainText('3 × 10 · 60 kg');
  await page.screenshot({ path: 'test-results/previa-do-treino.png' });
  await preview.getByRole('button', { name: 'Começar', exact: true }).click();

  card = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  await expect(card.getByTestId('dica-recorde')).toHaveText('Falta 1 repetição para o recorde com 60 kg (11).');
  await card.getByRole('textbox', { name: 'Reps da série 1' }).fill('11');
  await expect(card.getByTestId('dica-recorde')).toHaveText('Recorde de repetições com 60 kg nesta série.');
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(card.getByRole('status').filter({ hasText: 'Recorde:' })).toContainText('mais repetições nesta carga');
  await expect(card.getByRole('img', { name: /^Série 1: recorde/ })).toBeVisible();
  await card.screenshot({ path: 'test-results/recorde-na-hora.png' });

  // pausar: relógio e descanso parados; continuar volta o descanso
  await page.getByRole('button', { name: 'Pausar o treino' }).click();
  await expect(page.getByRole('region', { name: 'Treino pausado' })).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Descanso pausado' })).toBeVisible();
  await expect(page.getByText(/^Pausado · /)).toBeVisible();
  await page.screenshot({ path: 'test-results/treino-pausado.png' });
  await page.getByRole('region', { name: 'Treino pausado' }).getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('region', { name: 'Treino pausado' })).toHaveCount(0);
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('treino esquecido salva sozinho, e o próximo oferece o que ficou para trás (W4, W13)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.install({ time: new Date(2026, 10, 16, 18) }); // segunda
  await page.goto('/');
  await scratchPlan(page, { Segunda: ['Supino Reto (Barra)', 'Remada Curvada (Barra)'], Quarta: ['Agachamento Livre'] }, '40');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article', { name: 'Supino Reto (Barra)' }).getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();

  await page.clock.fastForward('46:00');
  await expect(page.getByRole('heading', { name: 'Ainda treinando?' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ainda-treinando.png' });
  await page.clock.fastForward('05:30');
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.clock.fastForward('00:01');

  // quarta: a remada ficou para trás na segunda
  await page.clock.setSystemTime(new Date(2026, 10, 18, 18));
  await page.reload();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const leftovers = page.getByRole('region', { name: 'Terminou cedo' });
  await expect(leftovers).toContainText('Remada Curvada (Barra)');
  await leftovers.getByRole('button', { name: 'Começar por ele' }).click();
  await expect(page.getByRole('article').first()).toHaveAttribute('aria-label', 'Remada Curvada (Barra)');
  await expect(page.getByRole('region', { name: 'Terminou cedo' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
