import { expect, test } from '@playwright/test';

test('atividades no histórico e na semana, e a sequência com o ajuste (W10)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 18, 19)); // quarta
  await page.goto('/');
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await page.getByRole('button', { name: '+ Registrar atividade ou recuperação' }).click();
  const sheet = page.getByRole('dialog', { name: 'Registrar atividade' });
  await sheet.getByRole('radio', { name: 'Futebol' }).click();
  await sheet.getByRole('button', { name: '1 h', exact: true }).click();
  await sheet.getByRole('textbox', { name: 'Observação (opcional)' }).fill('pelada de quarta');
  await page.screenshot({ path: 'test-results/registrar-atividade.png' });
  await sheet.getByRole('button', { name: 'Salvar' }).click();

  const list = page.getByRole('list', { name: 'Atividades de Novembro de 2026' });
  await expect(list).toContainText('Futebol · 1 h');
  await expect(list).toContainText('pelada de quarta');
  await expect(page.getByRole('heading', { name: 'Novembro de 2026 · 0 treinos · 1 atividade' })).toBeVisible();

  // "Outra" pede o nome
  await page.getByRole('button', { name: '+ Registrar atividade ou recuperação' }).click();
  await sheet.getByRole('radio', { name: 'Outra' }).click();
  await expect(sheet.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  await sheet.getByRole('textbox', { name: 'Qual atividade?' }).fill('Vôlei de praia');
  await sheet.getByRole('button', { name: 'Salvar' }).click();
  await expect(list).toContainText('Vôlei de praia · 30 min');
  await page.waitForTimeout(400);

  // na semana do Início
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByTestId('atividades-da-semana')).toHaveText('Quarta: futebol (1 h), vôlei de praia (30 min)');
  await expect(page.getByRole('listitem', { name: /^Quarta 18, futebol e vôlei de praia/ })).toBeVisible();
  await page.getByRole('region', { name: 'Esta semana' }).screenshot({ path: 'test-results/semana-com-atividade.png' });

  // apagar
  page.on('dialog', d => void d.accept());
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await page.getByRole('button', { name: /^Apagar Vôlei de praia/ }).click();
  await expect(list).not.toContainText('Vôlei de praia');

  // o ajuste da sequência existe e liga
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: /^Avisos e semana/ }).click();
  await page.getByRole('switch', { name: /^Dia com atividade registrada/ }).check();
  await expect(page.getByRole('switch', { name: /^Dia com atividade registrada/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test('tamanho do texto em passos, sem nenhuma aba passar da largura do celular (W17)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  const root = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  expect(await root()).toBe('16px');
  const sizes = page.getByRole('radiogroup', { name: 'Tamanho do texto' });
  await sizes.getByRole('radio', { name: 'Bem maior' }).click();
  expect(await root()).toBe('19.2px');
  await page.getByTestId('previa-do-texto').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/texto-bem-maior.png' });
  await page.waitForTimeout(400);

  // com o texto no maior passo, nada passa da largura (inclusive no treino)
  for (const tab of ['Início', 'Plano', 'Progresso', 'Perfil', 'Treino']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll, `aba ${tab}`).toBeLessThanOrEqual(width);
  }
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll, 'treino em andamento').toBeLessThanOrEqual(width);
  await page.screenshot({ path: 'test-results/texto-bem-maior-treino.png' });

  // fica guardado, e "Menor" diminui
  await page.reload();
  await expect.poll(root).toBe('19.2px');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await sizes.getByRole('radio', { name: 'Menor' }).click();
  expect(await root()).toBe('14.4px');
  expect(errors).toEqual([]);
});

test('Plano: descanso numa linha e treinos que recolhem (X6)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 18, 19));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Em casa 3×' }).click();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  // a tela do Plano baixa sob demanda (X14): espera chegar antes de medir
  await expect(page.getByRole('article', { name: 'Segunda' })).toBeVisible();
  const height = () => page.evaluate(() => document.documentElement.scrollHeight);
  const open = await height();

  // o dia de descanso é uma linha só, e ainda dá para pôr exercício nele
  const rest = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Descanso' }) }).first();
  expect((await rest.boundingBox())!.height).toBeLessThan(80);
  await expect(rest.getByRole('button', { name: 'Adicionar exercício (vira dia de treino)' })).toBeVisible();

  // recolher um treino
  const monday = page.getByRole('article', { name: 'Segunda' });
  await monday.getByRole('button', { name: 'Recolher Segunda' }).click();
  await expect(monday.getByTestId('treino-recolhido')).toHaveText(/^\d+ exercícios$/);
  await expect(monday.getByRole('button', { name: 'Adicionar exercício' })).toHaveCount(0);

  // recolher todos, e fica guardado
  await page.getByRole('button', { name: 'Recolher todos os treinos' }).click();
  await expect(page.getByTestId('treino-recolhido')).toHaveCount(3);
  expect(await height()).toBeLessThan(open * 0.6);
  await page.screenshot({ path: 'test-results/plano-recolhido.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByTestId('treino-recolhido')).toHaveCount(3);
  await page.getByRole('button', { name: 'Abrir todos os treinos' }).click();
  await expect(page.getByTestId('treino-recolhido')).toHaveCount(0);
  await expect(monday.getByRole('button', { name: 'Adicionar exercício' })).toBeVisible();
  expect(errors).toEqual([]);
});
