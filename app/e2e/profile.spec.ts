import { expect, test } from '@playwright/test';

test('perfil: dados, saúde, configurações e backup de ida e volta', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();

  await page.getByRole('textbox', { name: 'Nome' }).fill('Ana');
  await expect(page.getByRole('heading', { name: 'Ana', level: 1 })).toBeVisible();
  await page.getByLabel('Nascimento').fill('1990-01-01');
  await page.getByLabel('Sexo').selectOption('feminino');
  await page.getByRole('textbox', { name: 'Altura em cm' }).fill('165');
  await expect(page.getByText(/Para todos os cálculos, preencha: peso/)).toBeVisible();

  await page.getByRole('switch', { name: 'Mostrar ilustrações dos exercícios' }).uncheck();
  await page.getByRole('button', { name: 'Saiba mais' }).click();
  await expect(page.getByText(/não separa gordura de músculo/)).toBeVisible();
  await page.screenshot({ path: 'test-results/perfil.png', fullPage: true });

  // backup: exporta, muda o nome, restaura e o nome volta
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Fazer backup' }).click()]);
  const file = await download.path();
  await page.getByRole('textbox', { name: 'Nome' }).fill('Outro');
  page.once('dialog', d => d.accept());
  await page.getByLabel('Arquivo de backup').setInputFiles(file);
  await expect(page.getByRole('status').filter({ hasText: 'Backup restaurado: 0 treinos, 1 plano.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ana', level: 1 })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Mostrar ilustrações dos exercícios' })).not.toBeChecked();

  await page.waitForTimeout(400);
  await page.reload();
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ana', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('boas-vindas e backup com senha de ida e volta', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vindo(a)!' })).toBeVisible();
  await page.getByRole('button', { name: 'Preencher' }).click();
  await page.getByRole('textbox', { name: 'Nome' }).fill('Bia');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo(a)!' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Proteger o backup com senha' }).check();
  await page.getByRole('textbox', { name: 'Nova senha do backup' }).fill('segredo1');
  await page.getByRole('textbox', { name: 'Repita a senha' }).fill('segredo1');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Fazer backup' }).click()]);
  await expect(page.getByText(/Backup com senha salvo/)).toBeVisible();
  await expect(page.getByText(/Último backup:/)).toBeVisible();

  await page.getByRole('textbox', { name: 'Nome' }).fill('Outra');
  await page.getByLabel('Arquivo de backup').setInputFiles(await download.path());
  await expect(page.getByText('Este backup tem senha.')).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.getByRole('textbox', { name: 'Senha do backup', exact: true }).fill('segredo1');
  await page.getByRole('button', { name: 'Abrir' }).click();
  await expect(page.getByRole('heading', { name: 'Bia', level: 1 })).toBeVisible();
});
