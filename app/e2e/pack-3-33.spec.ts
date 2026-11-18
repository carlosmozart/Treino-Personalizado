import { expect, test } from '@playwright/test';

test('atividade registrada direto da semana no Início', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 18, 19)); // quarta
  await page.goto('/');
  const week = page.getByRole('region', { name: 'Esta semana' });
  await week.getByRole('button', { name: 'Registrar atividade ou recuperação' }).click();
  const sheet = page.getByRole('dialog', { name: 'Registrar atividade' });
  await sheet.getByRole('radio', { name: 'Sauna' }).click();
  await sheet.getByRole('button', { name: '15 min', exact: true }).click();
  await sheet.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByTestId('atividades-da-semana')).toHaveText('Quarta: sauna (15 min)');
  await week.screenshot({ path: 'test-results/semana-atalho-atividade.png' });
  expect(errors).toEqual([]);
});

test('com o texto bem maior, o nome do treino quebra em duas linhas em vez de cortar no começo', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Tamanho do texto' }).getByRole('radio', { name: 'Bem maior' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const title = page.getByRole('heading', { level: 1 });
  const box = await title.boundingBox();
  const line = await title.evaluate(el => parseFloat(getComputedStyle(el).lineHeight));
  // mais de uma linha: o nome não fica reduzido a "Segun…"
  expect(box!.height).toBeGreaterThan(line * 1.5);
  await page.screenshot({ path: 'test-results/nome-do-treino-texto-grande.png' });
  expect(errors).toEqual([]);
});

test('Plano, Progresso e Perfil abrem depois de baixar sob demanda, sem erro', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plano', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progresso', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Perfil', level: 1 })).toBeVisible();
  // a IA do Plano também baixa na hora em que abre
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero ou com IA' }).click();
  await page.getByRole('dialog', { name: 'Novo plano de treino' }).getByRole('button', { name: 'Montar treino com IA' }).click();
  await expect(page.getByRole('textbox', { name: 'Pedido para a IA' })).toBeVisible();
  expect(errors).toEqual([]);
});
