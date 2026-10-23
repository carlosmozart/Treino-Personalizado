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

test('plano: apagar e redigitar a faixa de reps, como no teclado do celular', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Corpo inteiro 3×' }).click();
  await page.getByRole('button', { name: /^Supino Reto \(Halteres\)/ }).first().click();
  const min = page.getByRole('textbox', { name: 'Reps mín. de Supino Reto (Halteres)' });
  const max = page.getByRole('textbox', { name: 'Reps máx. de Supino Reto (Halteres)' });
  await min.fill('8');
  await max.fill('12');
  // sem selecionar o número: cursor no fim, apaga um dígito por vez e digita de novo
  await max.click();
  await max.press('End');
  await max.press('Backspace');
  await expect(max).toHaveValue('1');
  await max.press('Backspace');
  await max.pressSequentially('10');
  await expect(max).toHaveValue('10');
  await expect(min).toHaveValue('8');
  // máximo abaixo do mínimo: ao sair do campo, o mínimo acompanha
  await max.fill('6');
  await min.focus();
  await expect(min).toHaveValue('6');
  await expect(page.getByText('3 × 6', { exact: true }).first()).toBeVisible();
});

test('biblioteca: filtrar, adicionar a um dia do plano e criar exercício próprio', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push(String(e.stack ?? e)));
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Corpo inteiro 3×' }).click();
  await page.getByRole('button', { name: 'Biblioteca' }).click();
  await expect(page.getByText('153 exercícios')).toBeVisible();

  await page.getByRole('group', { name: 'Grupo muscular' }).getByRole('button', { name: 'Ombro' }).click();
  await page.getByRole('group', { name: 'Equipamento' }).getByRole('button', { name: 'Halteres' }).click();
  await expect(page.getByText('7 exercícios')).toBeVisible();
  await page.getByRole('button', { name: /^Remada Alta \(Halteres\)/ }).click();
  await page.getByRole('button', { name: 'Segunda · Corpo inteiro A' }).click();
  await expect(page.getByText('Remada Alta (Halteres) adicionado em Segunda.')).toBeVisible();

  await page.getByRole('button', { name: 'Criar exercício' }).click();
  await page.getByRole('textbox', { name: 'Nome' }).fill('Remada no cabo unilateral');
  await page.getByRole('combobox', { name: 'Grupo muscular' }).selectOption('Costas');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(page.getByText('Costas · Polia · seu')).toBeVisible();
  await page.getByRole('button', { name: 'Meus' }).click();
  await expect(page.getByText('1 exercício', { exact: true })).toBeVisible();

  // depois de várias trocas de painel, o voltar fecha a Biblioteca e continua no app (não sai da página)
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Plano', level: 1 })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Segunda' })).toContainText('Remada Alta (Halteres)');
  expect(errors).toEqual([]);
});

test('início: remarcar o treino de hoje para outro dia e desfazer (M19)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 9, 19, 10)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Superior / Inferior 4×' }).click();
  await expect(page.getByRole('heading', { name: 'Segunda: Superior A' })).toBeVisible();

  await page.getByRole('button', { name: 'Hoje não dá: remarcar para outro dia' }).click();
  const sheet = page.getByRole('dialog', { name: 'Remarcar o treino' });
  await expect(sheet.getByRole('button', { name: /Amanhã\s*Já tem treino/ })).toBeDisabled();
  await page.screenshot({ path: 'test-results/remarcar-treino.png' });
  await sheet.getByRole('button', { name: /Quarta-feira, 21\s*Livre/ }).click();

  await expect(page.getByRole('heading', { name: 'Dia de descanso' })).toBeVisible();
  await expect(page.getByText('Você remarcou o treino de hoje para quarta-feira, 21.')).toBeVisible();
  const week = page.getByRole('region', { name: 'Esta semana' });
  await expect(week.getByRole('listitem', { name: 'Quarta 21, treino remarcado para este dia' })).toBeVisible();
  await page.screenshot({ path: 'test-results/remarcado.png' });

  await page.getByRole('button', { name: 'Desfazer: treinar hoje' }).click();
  await expect(page.getByRole('heading', { name: 'Segunda: Superior A' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Começar treino' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('semana começando no domingo, semana de deload e repetições por lado (M19, M32, M31)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 9, 19, 10)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Superior / Inferior 4×' }).click();

  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'A semana começa na' }).getByRole('radio', { name: 'Domingo' }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  const week = page.getByRole('region', { name: 'Esta semana' });
  await expect(week.getByRole('listitem').first()).toHaveAccessibleName(/^Domingo 18/);

  await page.getByRole('button', { name: 'Marcar esta semana como deload' }).click();
  await expect(page.getByText('Semana de deload.')).toBeVisible();
  await page.screenshot({ path: 'test-results/deload.png', fullPage: true });

  await page.getByRole('button', { name: 'Editar plano' }).click();
  const row = page.locator('button[aria-expanded="false"]').filter({ hasText: /\d × / }).first();
  await row.click();
  await page.getByRole('checkbox', { name: /Repetições por lado/ }).check();
  await expect(page.locator('button[aria-expanded="true"]').filter({ hasText: 'por lado' })).toBeVisible();
  expect(errors).toEqual([]);
});
