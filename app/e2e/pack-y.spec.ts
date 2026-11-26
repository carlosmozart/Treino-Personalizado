import { expect, test } from '@playwright/test';

test('pesagem fora da curva pede confirmação (Y1)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 25, 10));
  await page.goto('/');
  const weigh = async (kg: string, date?: string) => {
    await page.getByRole('button', { name: '+ Registrar', exact: true }).click();
    await page.getByRole('textbox', { name: /^Peso de .* em kg$/ }).fill(kg);
    if (date) await page.getByLabel('Data da pesagem').fill(date);
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  };
  await weigh('81', '2026-11-20');
  // 18 no lugar de 81: o app pergunta
  await weigh('18');
  const ask = page.getByRole('alert').filter({ hasText: 'Está certo?' });
  await expect(ask).toContainText('18 kg é 78% a menos que a pesagem de 20 nov (81 kg)');
  await page.screenshot({ path: 'test-results/pesagem-fora-da-curva.png' });
  // corrigir o número esconde a pergunta e salva direto
  await page.getByRole('textbox', { name: 'Peso de hoje em kg' }).fill('81,4');
  await expect(ask).toHaveCount(0);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Registrar peso' })).toHaveCount(0);
  // e dá para salvar assim mesmo
  await weigh('95');
  await page.getByRole('button', { name: 'Salvar assim' }).click();
  await expect(page.getByRole('dialog', { name: 'Registrar peso' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Biblioteca: o mesmo exercício em vários dias de uma vez (Y3) e Relatar um problema (Y6)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Corpo inteiro 3×' }).click();
  await page.getByRole('button', { name: 'Biblioteca' }).click();
  await page.getByRole('textbox', { name: /Buscar/ }).fill('Face Pull');
  await page.getByRole('button', { name: /^Face Pull/ }).first().click();
  await page.getByRole('button', { name: 'Em vários dias…' }).click();
  const days = page.getByRole('group', { name: 'Dias para adicionar' });
  await days.getByRole('checkbox', { name: /^Segunda/ }).check();
  await days.getByRole('checkbox', { name: /^Sexta/ }).check();
  await page.getByRole('button', { name: 'Adicionar em 2 dias' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Face Pull adicionado em Segunda, Sexta.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('article', { name: 'Segunda' })).toContainText('Face Pull');
  await expect(page.getByRole('article', { name: 'Sexta' })).toContainText('Face Pull');
  await expect(page.getByRole('article', { name: 'Quarta' })).not.toContainText('Face Pull');

  // Y6: o link leva ao formulário do GitHub com a versão preenchida (não abre aqui)
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  const link = page.getByRole('link', { name: 'Relatar um problema' });
  const href = new URL((await link.getAttribute('href'))!);
  expect(href.pathname).toBe('/carlosmozart/Treino-Personalizado/issues/new');
  expect(href.searchParams.get('template')).toBe('problema.yml');
  expect(href.searchParams.get('versao')).toMatch(/^\d+\.\d+\.\d+$/);
  expect(await link.getAttribute('target')).toBe('_blank');
  expect(errors).toEqual([]);
});
