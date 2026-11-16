import { expect, test } from '@playwright/test';

test('Progresso: esconder e reordenar os cartões, e a escolha fica guardada (X6)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  const heat = page.getByRole('heading', { name: 'Últimos 6 meses' });
  const groups = page.getByRole('heading', { name: 'Séries por grupo (30 dias)' });
  const exercise = page.getByRole('heading', { name: 'Evolução por exercício' });
  await expect(heat).toBeVisible();
  const y = async (h: typeof heat) => (await h.boundingBox())!.y;
  expect(await y(groups)).toBeGreaterThan(await y(exercise));
  const before = await page.evaluate(() => document.documentElement.scrollHeight);

  await page.getByRole('button', { name: 'Organizar esta tela' }).click();
  const sheet = page.getByRole('dialog', { name: 'Organizar esta tela' });
  await sheet.getByRole('switch', { name: 'Mostrar Últimos 6 meses' }).uncheck();
  await sheet.getByRole('switch', { name: 'Mostrar Séries da semana' }).uncheck();
  await sheet.getByRole('button', { name: 'Subir Séries por grupo' }).click();
  await expect(sheet.getByRole('button', { name: 'Subir Últimos 6 meses' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/organizar-progresso.png' });
  await sheet.getByRole('button', { name: 'Pronto' }).click();

  await expect(heat).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Séries da semana' })).toHaveCount(0);
  expect(await y(groups)).toBeLessThan(await y(exercise));
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(before);
  await expect(page.getByRole('button', { name: 'Organizar esta tela (2 cartões escondidos)' })).toBeVisible();

  // fica guardado no aparelho
  await page.reload();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(groups).toBeVisible();
  await expect(heat).toHaveCount(0);

  // voltar ao padrão
  await page.getByRole('button', { name: /^Organizar esta tela/ }).click();
  await sheet.getByRole('button', { name: 'Voltar ao padrão' }).click();
  await sheet.getByRole('button', { name: 'Pronto' }).click();
  await expect(heat).toBeVisible();
  expect(await y(groups)).toBeGreaterThan(await y(exercise));
  expect(errors).toEqual([]);
});

test('treino livre não oferece travar a carga; no plano, oferece (X8)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Treino livre, sem seguir o plano' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para adicionar' }).fill('supino reto barra');
  await page.getByRole('button', { name: 'Supino Reto (Barra)', exact: true }).first().click();
  await page.getByRole('article', { name: 'Supino Reto (Barra)' }).getByRole('button', { name: 'Opções de Supino Reto (Barra)' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar série', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Travar a carga/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Trocar ou cancelar treino' }).click();
  await page.getByRole('button', { name: 'Cancelar treino', exact: true }).click();

  // com plano, a trava continua lá
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();
  await first.getByRole('button', { name: /^Opções de / }).click();
  await expect(page.getByRole('button', { name: /^Travar a carga/ })).toBeVisible();
  expect(errors).toEqual([]);
});
