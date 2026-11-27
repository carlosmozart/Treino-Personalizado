import { expect, test, type Page } from '@playwright/test';

async function withTemplate(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dispensar o tour' }).click();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Em casa 3×' }).click();
}

test('Plano: trocar um exercício por outro, com Desfazer, e o antigo vira reserva', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await withTemplate(page);
  await page.getByRole('button', { name: 'Plano', exact: true }).click();

  const day = page.getByRole('article').filter({ has: page.getByRole('button', { name: /^Trocar|^Adicionar exercício/ }) }).first();
  const row = day.getByRole('listitem').first().getByRole('button', { expanded: false }).first();
  const oldName = (await row.locator('span.truncate').first().textContent())!.trim();
  await row.click();
  await day.getByRole('button', { name: `Trocar ${oldName} por outro exercício` }).click();

  const sheet = page.getByRole('dialog', { name: `Trocar ${oldName}` });
  await expect(sheet.getByText(/Do mesmo grupo/)).toBeVisible();
  await sheet.getByRole('textbox', { name: 'Buscar exercício para trocar no plano' }).fill('remada curvada');
  await sheet.getByRole('button', { name: 'Remada Curvada (Barra)' }).click();
  await expect(sheet).toHaveCount(0);

  await expect(day.getByRole('status')).toHaveText(new RegExp(`${oldName.replace(/[()]/g, '\\$&')} trocado por Remada Curvada \\(Barra\\)\\.`));
  await expect(day.getByText('Remada Curvada (Barra)', { exact: true })).toBeVisible();
  // o antigo ficou como reserva, para trocar de volta no treino
  await expect(day.getByRole('button', { name: `Remover reserva ${oldName}` })).toBeVisible();

  await day.getByRole('button', { name: 'Desfazer' }).click();
  await expect(day.getByText(oldName, { exact: true }).first()).toBeVisible();
  await expect(day.getByText('Remada Curvada (Barra)', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Treino: trocou o exercício, o app pergunta se vale para o plano também', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await withTemplate(page);
  await page.getByRole('button', { name: /^Começar / }).first().click();

  const card = page.getByRole('article').first();
  const oldName = (await card.getByRole('heading').first().textContent())!.replace(/^\d+\s*/, '').trim();
  await card.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Trocar exercício' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para trocar' }).fill('remada curvada');
  await page.getByRole('dialog', { name: 'Trocar por' }).getByRole('button', { name: 'Remada Curvada (Barra)' }).click();

  const ask = page.getByRole('group', { name: 'Salvar no plano' });
  await expect(ask).toContainText(`Trocar ${oldName} por Remada Curvada (Barra) no plano também?`);
  await ask.getByRole('button', { name: 'Salvar no plano' }).click();
  await expect(ask).toHaveCount(0);

  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByText('Remada Curvada (Barra)', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('Treino: "Só hoje" deixa o plano como estava', async ({ page }) => {
  await withTemplate(page);
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const card = page.getByRole('article').first();
  await card.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Trocar exercício' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para trocar' }).fill('remada curvada');
  await page.getByRole('dialog', { name: 'Trocar por' }).getByRole('button', { name: 'Remada Curvada (Barra)' }).click();
  await page.getByRole('group', { name: 'Salvar no plano' }).getByRole('button', { name: 'Só hoje' }).click();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByText('Remada Curvada (Barra)', { exact: true })).toHaveCount(0);
});
