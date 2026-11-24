import { expect, test, type Locator, type Page } from '@playwright/test';

/** Arrasta com o mouse (vira pointer events, como o dedo) a partir do centro do elemento. */
async function drag(page: Page, from: Locator, dx: number, dy = 0, atX?: number) {
  const box = (await from.boundingBox())!;
  const x = box.x + (atX ?? box.width / 2), y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await page.mouse.up();
}

test('modo foco: deslizar o cartão troca de exercício, sem atrapalhar o deslizar das séries (N15)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 23, 10));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Em casa 3×' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('button', { name: 'Um exercício por vez' }).click();
  await expect(page.getByText('Exercício 1/8')).toBeVisible();
  const card = page.getByTestId('deslizar-exercicio');
  const heading = card.getByRole('heading').first();

  // no primeiro, para a direita não há anterior
  await drag(page, heading, 160);
  await expect(page.getByText('Exercício 1/8')).toBeVisible();

  // para a esquerda: o próximo; para a direita: volta
  await drag(page, heading, -160);
  await expect(page.getByText('Exercício 2/8')).toBeVisible();
  await drag(page, card.getByRole('heading').first(), 160);
  await expect(page.getByText('Exercício 1/8')).toBeVisible();

  // arraste curto ou mais vertical que horizontal: fica
  await drag(page, heading, -40);
  await drag(page, heading, -60, 120);
  await expect(page.getByText('Exercício 1/8')).toBeVisible();

  // numa série, o gesto é da série (direita copia) e o exercício não muda
  const sets = card.locator('[data-swipe-row]');
  const before = await sets.count();
  // pela borda da linha, longe dos campos de carga e repetições
  await drag(page, sets.first(), 160, 0, 12);
  await expect(sets).toHaveCount(before + 1);
  await expect(page.getByText('Exercício 1/8')).toBeVisible();
  expect(errors).toEqual([]);
});
