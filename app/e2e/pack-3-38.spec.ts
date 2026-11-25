import { expect, test, type Page } from '@playwright/test';

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

test('esforço por série em RIR, e a barra fixa assistida com ajuda que diminui (M22, T11)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 23, 18)); // segunda
  await page.goto('/');
  // M22: ligar o esforço em RIR
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: /^Durante o treino/ }).click();
  await page.getByRole('combobox', { name: 'Anotar o esforço de cada série' }).selectOption('rir');

  await scratchPlan(page, ['Barra Fixa Assistida (Gravitron)'], '30');
  await startToday(page);
  const card = page.getByRole('article', { name: 'Barra Fixa Assistida (Gravitron)' });
  // T11: a carga é a ajuda
  await expect(card).toContainText('Ajuda (kg)');
  await expect(card).toContainText('Assistido: menos ajuda = mais forte');

  await card.getByRole('button', { name: /^Série 1: opções/ }).click();
  const effort = page.getByRole('group', { name: 'Esforço da série 1' });
  await expect(effort.getByRole('button')).toHaveText(['4+', '3', '2', '1', '0']);
  await effort.getByRole('button', { name: '2', exact: true }).click();
  await expect(effort.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(card.getByRole('button', { name: 'Série 1: opções, RIR 2' })).toBeVisible();
  await card.screenshot({ path: 'test-results/assistido-rir.png' });
  expect(errors).toEqual([]);
});
