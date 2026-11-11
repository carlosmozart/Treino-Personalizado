import { expect, test, type Page } from '@playwright/test';

/** Plano do zero com os exercícios dados na segunda. */
async function scratchPlan(page: Page, names: string[]) {
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero' }).click();
  await page.getByRole('button', { name: 'Criar plano e adicionar exercícios' }).click();
  const monday = page.getByRole('article', { name: 'Segunda' });
  await monday.getByRole('button', { name: 'Adicionar exercício' }).click();
  const sheet = page.getByRole('dialog');
  for (const n of names) {
    await sheet.getByRole('textbox', { name: 'Nome do exercício' }).fill(n);
    await sheet.getByRole('button', { name: n }).first().click();
  }
  await sheet.getByRole('button', { name: /^Pronto/ }).click();
  return monday;
}

test('criar do zero: dias e forma, treinos vazios com nome e vários exercícios de uma vez', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 9, 10)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero' }).click();
  await page.getByRole('textbox', { name: 'Nome do plano' }).fill('Meu ABC');
  await page.getByRole('button', { name: 'Sábado' }).click();
  const preview = page.getByTestId('previa-do-zero');
  await expect(preview).toContainText('4 treinos vazios');
  await expect(preview).toContainText('sábado (Treino D)');
  await page.getByRole('radio', { name: /^Rotação/ }).click();
  await expect(preview).toContainText('Meta de 4 treinos por semana');
  await page.getByRole('radio', { name: /^Cada dia tem o seu treino/ }).click();
  await page.screenshot({ path: 'test-results/do-zero-painel.png' });
  await page.getByRole('button', { name: 'Criar plano e adicionar exercícios' }).click();

  await expect(page.getByTestId('plano-vazio')).toBeVisible();
  const monday = page.getByRole('article', { name: 'Segunda' });
  await expect(monday.getByRole('heading', { name: 'Treino A' })).toBeVisible();
  await expect(monday.getByText('Ainda sem exercícios.')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Terça' }).getByRole('heading', { name: 'Descanso' })).toBeVisible();
  await page.screenshot({ path: 'test-results/do-zero-plano.png', fullPage: true });

  // o Início também aponta para os exercícios
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agora, os exercícios' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar exercícios' }).click();

  // pelo grupo e pela busca, sem o painel fechar
  await monday.getByRole('button', { name: 'Adicionar exercício' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('radio', { name: 'Peito' }).click();
  await sheet.getByRole('button', { name: 'Supino Reto (Barra)' }).click();
  await expect(sheet.getByRole('status')).toContainText('Supino Reto (Barra) adicionado');
  await expect(sheet.getByRole('button', { name: /Supino Reto \(Barra\).*já está no treino/ })).toBeVisible();
  await sheet.getByRole('textbox', { name: 'Nome do exercício' }).fill('agachamento livre');
  await sheet.getByRole('button', { name: 'Agachamento Livre' }).first().click();
  await page.screenshot({ path: 'test-results/do-zero-adicionar.png' });
  await sheet.getByRole('button', { name: 'Pronto (2 adicionados)' }).click();

  await expect(page.getByTestId('plano-vazio')).toHaveCount(0);
  await expect(monday.getByText('Supino Reto (Barra)')).toBeVisible();
  await expect(monday.getByText(/^Agachamento Livre/)).toBeVisible();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Treino A' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('aquecimento automático, descanso só desta série e o aquecimento no volume', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 9, 18)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: /^Aquecimento automático/ }).check();
  await page.getByRole('switch', { name: 'Contar o aquecimento no volume' }).check();
  const monday = await scratchPlan(page, ['Supino Reto (Barra)']);
  // o último adicionado fica aberto para ajustar
  await monday.getByRole('textbox', { name: 'Carga (kg) de Supino Reto (Barra)' }).fill('60');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();

  const card = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  // 60 kg na barra de 20: 20 × 10, 22,5 × 8, 35 × 5, 47,5 × 3
  await expect(card.getByRole('button', { name: /\(aquecimento\): opções/ })).toHaveCount(4);
  await expect(card.getByRole('textbox', { name: 'Carga da série 3' })).toHaveValue('35');
  // a carga de trabalho sobe e a rampa acompanha
  await card.getByRole('textbox', { name: 'Carga da série 5' }).fill('100');
  await expect(card.getByRole('textbox', { name: 'Carga da série 2' })).toHaveValue('40');
  await card.screenshot({ path: 'test-results/aquecimento-automatico.png' });

  // aquecimento feito: entra no volume do cabeçalho
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByText(/séries · 200 kg/)).toBeVisible();

  // descanso só da série 5: sem cronômetro
  await card.getByRole('button', { name: 'Série 5: opções' }).click();
  await page.getByRole('button', { name: /^Descanso depois desta série/ }).click();
  await page.getByRole('radio', { name: 'Sem' }).click();
  await page.screenshot({ path: 'test-results/descanso-da-serie.png' });
  await page.getByRole('button', { name: 'Salvar: Sem cronômetro' }).click();
  await card.getByRole('button', { name: 'Série 5: opções' }).click();
  await expect(page.getByRole('button', { name: /^Descanso depois desta série.*Sem cronômetro, só neste treino/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await card.getByRole('button', { name: 'Série 5 feita' }).click();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveCount(0);
  // as outras séries seguem o descanso do exercício
  await card.getByRole('button', { name: 'Série 6 feita' }).click();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
  expect(errors).toEqual([]);
});
