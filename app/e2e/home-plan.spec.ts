import { expect, test } from '@playwright/test';

test('início: criar plano do zero, depois trocar por um modelo pelo cartão do plano', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar do zero ou com IA' }).click();
  await page.getByRole('button', { name: 'Criar do zero', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plano', level: 1 })).toBeVisible();
  await expect(page.getByText('Novo plano', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Início', exact: true }).click();
  const card = page.getByRole('region', { name: 'Plano de treino' });
  await expect(card.getByRole('heading', { name: 'Novo plano' })).toBeVisible();
  await card.getByRole('button', { name: 'Novo plano', exact: true }).click();
  await page.getByRole('button', { name: 'Usar um modelo pronto' }).click();
  await page.getByRole('button', { name: 'Usar ABC 3×' }).click();
  await expect(card.getByRole('heading', { name: 'ABC 3×' })).toBeVisible();
  await expect(card.getByText('3 dias por semana')).toBeVisible();
  await page.screenshot({ path: 'test-results/inicio-plano.png', fullPage: true });

  // o plano anterior continua salvo e dá para voltar a ele
  await card.getByRole('button', { name: 'Novo plano', exact: true }).click();
  await page.getByRole('button', { name: 'Usar “Novo plano”' }).click();
  await expect(card.getByRole('heading', { name: 'Novo plano' })).toBeVisible();
  await card.getByRole('button', { name: 'Editar plano' }).click();
  await expect(page.getByRole('heading', { name: 'Plano', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('perfil: registrar o peso direto no campo Peso atual', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar peso' }).click();
  await page.getByRole('textbox', { name: 'Peso de hoje em kg' }).fill('81,3');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('81,3 kg').first()).toBeVisible();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Peso' })).toContainText('81,3 kg');
});

test('treino: trocar pelo treino de outro dia e cancelar sem salvar', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Superior / Inferior 4×' }).click();
  await page.getByRole('button', { name: 'Começar Segunda: Superior A' }).click();
  await expect(page.getByRole('heading', { name: 'Segunda: Superior A', level: 1 })).toBeVisible();
  const first = page.getByRole('article').first();
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();

  await page.getByRole('button', { name: 'Trocar ou cancelar treino' }).click();
  await expect(page.getByText('A série marcada não será salva.')).toBeVisible();
  await page.screenshot({ path: 'test-results/trocar-treino.png' });
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Trocar por Terça: Inferior A' }).click();
  await expect(page.getByRole('heading', { name: 'Terça: Inferior A', level: 1 })).toBeVisible();
  await expect(page.getByText(/0\/\d+ séries/)).toBeVisible();

  await page.getByRole('button', { name: 'Trocar ou cancelar treino' }).click();
  await page.getByRole('button', { name: 'Cancelar treino', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Começar Segunda: Superior A' })).toBeVisible();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByText('Terça: Inferior A')).toHaveCount(0);
  expect(errors).toEqual([]);
});
