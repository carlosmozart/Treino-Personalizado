import { expect, test, type Locator, type Page } from '@playwright/test';

/** Arrasta com o mouse (vira pointer events, como o dedo) a partir de um ponto do elemento. */
async function drag(page: Page, from: Locator, dx: number, atX = 40) {
  const box = (await from.boundingBox())!;
  const x = box.x + atX, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y);
  await page.mouse.up();
}

/** Plano do zero com os exercícios na segunda; a carga do primeiro fica em `kg`. */
async function scratchPlan(page: Page, names: string[], kg: string) {
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
  // o último adicionado fica aberto; o primeiro abre com um toque
  const field = monday.getByRole('textbox', { name: `Carga (kg) de ${names[0]}` });
  if (!(await field.isVisible())) await monday.getByRole('button', { name: new RegExp(`^${names[0]!.replace(/[()]/g, '\\$&')}`) }).click();
  await field.fill(kg);
  await page.waitForTimeout(400);
  return monday;
}

async function startToday(page: Page) {
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
}

test('anilhas: a barra W na rosca, peso da barra e atalho das anilhas (T7)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 23, 18)); // segunda
  await page.goto('/');
  await scratchPlan(page, ['Rosca Direta (Barra W)'], '30');
  await startToday(page);

  const card = page.getByRole('article', { name: 'Rosca Direta (Barra W)' });
  await card.getByRole('button', { name: 'Opções de Rosca Direta (Barra W)' }).click();
  await page.getByRole('button', { name: 'Anilhas na barra' }).click();
  const sheet = page.getByRole('dialog', { name: 'Anilhas na barra' });
  // a W pesa 10 kg: 30 kg = 10 de cada lado
  await expect(sheet).toContainText('barra W/EZ de 10 kg');
  await expect(sheet.getByRole('radio', { name: 'W / EZ · 10 kg' })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByRole('status')).toContainText('10');

  // a W da academia pesa 8 kg: sobra 1 kg por lado, que só dá com as pequenas
  await sheet.getByRole('textbox', { name: 'Peso da barra W/EZ em kg' }).fill('8');
  await expect(sheet.getByRole('status')).toContainText('Faltam 1 kg por lado');
  await sheet.getByRole('button', { name: 'Com as pequenas' }).click();
  await expect(sheet.getByRole('status')).toContainText('10 + 1');
  await expect(sheet.getByRole('button', { name: '1,5' })).toHaveAttribute('aria-pressed', 'true');
  await sheet.screenshot({ path: 'test-results/anilhas-barra-w.png' });

  // trocar a barra do exercício para a olímpica (20 kg): 5 de cada lado
  await sheet.getByRole('radio', { name: /^Olímpica/ }).click();
  await expect(sheet.getByRole('status')).toContainText('5');
  await expect(sheet).toContainText('barra olímpica de 20 kg');
  expect(errors).toEqual([]);
});

test('drop-set e rest-pause: marca na série, sem descanso antes do drop e 15 s antes do rest-pause (M49)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 23, 18)); // segunda
  await page.goto('/');
  await scratchPlan(page, ['Rosca Direta (Barra W)'], '30');
  await startToday(page);
  const card = page.getByRole('article', { name: 'Rosca Direta (Barra W)' });

  // a primeira série não tem drop-set (não continua nenhuma)
  await card.getByRole('button', { name: /^Série 1: opções/ }).click();
  await expect(page.getByRole('button', { name: /Marcar como drop-set/ })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await card.getByRole('button', { name: /^Série 2: opções/ }).click();
  await page.getByRole('button', { name: /Marcar como drop-set/ }).click();
  await expect(card.getByRole('button', { name: 'Série 2: opções, drop-set' })).toHaveText('D');
  await card.getByRole('button', { name: /^Série 3: opções/ }).click();
  await page.getByRole('button', { name: /Marcar como rest-pause/ }).click();
  await expect(card.getByRole('button', { name: 'Série 3: opções, rest-pause' })).toHaveText('RP');
  await card.screenshot({ path: 'test-results/drop-set.png' });

  // série 1 feita: o drop vem em seguida, sem descanso
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveCount(0);
  // série 2 (drop) feita: o rest-pause vem depois de 15 s
  await card.getByRole('button', { name: 'Série 2 feita' }).click();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toContainText('0:15');
  expect(errors).toEqual([]);
});

test('deslizar para apagar um treino do histórico e uma pesagem, com Desfazer (N15)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  // um treino curto
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: 'Finalizar assim' }).click();

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  const item = page.locator('[data-swipe-row]').filter({ hasText: '1 exercício' });
  await expect(item).toHaveCount(1);
  // para a direita não copia: volta
  await drag(page, item, 160);
  await expect(item).toHaveCount(1);
  await drag(page, item, -160, 200);
  await expect(page.getByText('Nenhum treino registrado ainda.', { exact: false })).toBeVisible();
  const undoWorkout = page.getByRole('status').filter({ hasText: /^Treino de .* apagado\.Desfazer$/ });
  await expect(undoWorkout).toBeVisible();
  await undoWorkout.getByRole('button', { name: 'Desfazer' }).click();
  await expect(item).toHaveCount(1);

  // uma pesagem: deslizar apaga, Desfazer traz de volta
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: '+ Registrar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Peso de hoje em kg' }).fill('91');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  const weigh = page.locator('[data-swipe-row]').filter({ hasText: '91 kg' });
  await drag(page, weigh, -160, 20);
  await expect(page.getByRole('status').filter({ hasText: /^Pesagem de .* apagada\.Desfazer$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('button', { name: /^Apagar pesagem de / })).toHaveCount(1);
  expect(errors).toEqual([]);
});
