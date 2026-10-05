import { expect, test } from '@playwright/test';

test('treino: ajuste de carga, troca pela biblioteca e carga suspeita', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();

  const carga = first.getByRole('textbox', { name: 'Carga da série 2' });
  const before = Number((await carga.inputValue()).replace(',', '.'));
  await first.getByRole('button', { name: '+10' }).click();
  await expect(carga).toHaveValue(String(before + 10).replace('.', ','));
  await expect(page.getByText('Conquista desbloqueada: Os Pesos de Rock Lee')).toBeVisible();

  // carga absurda sem histórico: confere antes de marcar
  await first.getByRole('textbox', { name: 'Carga da série 1' }).fill('900');
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(page.getByRole('dialog', { name: 'Conferir a carga' })).toBeVisible();
  await page.getByRole('button', { name: 'Corrigir para 90 kg' }).click();
  await expect(first.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  await expect(first.getByRole('textbox', { name: 'Carga da série 1' })).toHaveValue('90');
  await page.getByRole('button', { name: 'Pular' }).click();

  // troca por qualquer exercício da biblioteca
  const name = await first.getAttribute('aria-label');
  await first.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Trocar exercício' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para trocar' }).fill('crucifixo com');
  await page.getByRole('button', { name: 'Crucifixo com Halteres' }).click();
  const swapped = page.getByRole('article', { name: 'Crucifixo com Halteres' });
  await expect(swapped.getByText(`no lugar de ${name}`)).toBeVisible();
  expect(errors).toEqual([]);
});
