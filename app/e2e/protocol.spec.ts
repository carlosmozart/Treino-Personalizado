import { expect, test } from '@playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('protocolo: ligar no Perfil, montar, registrar a dose do dia, diário e resumo (Z1)', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 9)); // segunda
  await page.goto('/');

  // escondida por padrão
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Histórico' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Protocolo' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();
  await expect(page.getByText('Nenhum protocolo ainda.')).toBeVisible();

  // montar o protocolo
  await page.getByRole('button', { name: '+ Novo' }).click();
  const editor = page.getByRole('dialog', { name: 'Novo protocolo' });
  await editor.getByRole('textbox', { name: 'Nome' }).first().fill('Reposição');
  await editor.getByRole('radio', { name: 'Reposição hormonal' }).click();
  await editor.getByRole('switch', { name: /Sem data para acabar/ }).check();
  const first = editor.getByRole('group', { name: 'Substância 1' });
  await first.getByRole('combobox', { name: 'Nome' }).fill('Testosterona (cipionato)');
  await first.getByRole('textbox', { name: 'Dose da substância 1' }).fill('100');
  // Z2: meia-vida informada pela pessoa, só para a curva
  await first.getByRole('textbox', { name: 'Meia-vida da substância 1' }).fill('8');
  await editor.getByRole('button', { name: '+ Outra substância' }).click();
  const second = editor.getByRole('group', { name: 'Substância 2' });
  await second.getByRole('combobox', { name: 'Nome' }).fill('Anastrozol');
  await second.getByRole('radio', { name: 'Medicamento' }).click();
  await second.getByRole('textbox', { name: 'Dose da substância 2' }).fill('0,5');
  await second.getByRole('combobox', { name: 'Via' }).selectOption('oral');
  await second.getByRole('radio', { name: 'Dias da semana' }).click();
  await expect(second.getByText('Dá 1 mg por semana.')).toBeVisible();
  await page.screenshot({ path: 'test-results/protocolo-editor.png' });
  await editor.getByRole('button', { name: 'Salvar protocolo' }).click();
  await expect(editor).toHaveCount(0);

  const card = page.getByRole('article', { name: 'Reposição' });
  await expect(card).toContainText('Reposição hormonal · Semana 1 · contínuo');
  await expect(card).toContainText('Testosterona (cipionato) · 100 mg a cada 7 dias · IM');
  await expect(card).toContainText('Anastrozol · 0,5 mg segunda e quinta · oral');

  // Z2: curva estimada da substância com meia-vida (a outra não tem, então não há escolha)
  const curve = page.getByRole('region', { name: 'Curva estimada' });
  await expect(curve).toContainText('Testosterona (cipionato) · 100 mg · meia-vida 8 dias');
  await expect(curve.getByRole('radiogroup', { name: 'Substância da curva' })).toHaveCount(0);
  await expect(curve.getByRole('img')).toHaveAttribute('aria-label', /^Curva estimada de 16 nov a .+: máximo \d/);
  await expect(curve).toContainText(/Hoje: cerca de \d/);
  await curve.getByText('Ver por semana').click();
  await expect(curve.getByRole('row').nth(1)).toContainText('1 (16 nov)');
  await curve.getByRole('radio', { name: 'Registradas' }).click();
  await expect(curve).toContainText('até hoje, as doses que você registrou');
  await curve.getByRole('radio', { name: 'Previstas' }).click();
  await curve.scrollIntoViewIfNeeded();
  await curve.screenshot({ path: 'test-results/protocolo-curva.png' });

  // as duas doses de hoje (segunda)
  const today = page.getByRole('region', { name: 'Doses de hoje' });
  await expect(today.getByRole('heading')).toHaveText('Hoje: 2 doses para registrar');
  await today.getByRole('button', { name: 'Registrar Testosterona (cipionato)' }).click();
  const dose = page.getByRole('dialog', { name: 'Registrar Testosterona (cipionato)' });
  await expect(dose.getByRole('radio', { name: 'Glúteo esquerdo' })).toHaveAttribute('aria-checked', 'true');
  await dose.getByRole('button', { name: 'Salvar dose' }).click();
  await expect(today).toContainText('Registrada · glúteo esquerdo');
  await expect(today.getByRole('heading')).toHaveText('Hoje: 1 dose para registrar');

  // no Início também
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  const home = page.getByRole('region', { name: 'Doses de hoje' });
  await home.getByRole('button', { name: 'Registrar Anastrozol' }).click();
  await page.getByRole('dialog', { name: 'Registrar Anastrozol' }).getByRole('button', { name: 'Salvar dose' }).click();
  await expect(home.getByRole('heading')).toHaveText('Doses de hoje registradas');

  // diário: pressão e exame
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();
  await page.getByRole('button', { name: '+ Pressão' }).click();
  const bp = page.getByRole('dialog', { name: 'Pressão' });
  await bp.getByRole('textbox', { name: 'Pressão máxima (sistólica)' }).fill('145');
  await bp.getByRole('textbox', { name: 'Pressão mínima (diastólica)' }).fill('92');
  await bp.getByRole('button', { name: 'Salvar' }).click();
  await page.getByRole('button', { name: '+ Exame' }).click();
  const exam = page.getByRole('dialog', { name: 'Exame de sangue' });
  await exam.getByRole('combobox', { name: 'Exame 1' }).fill('Hematócrito');
  await expect(exam.getByRole('textbox', { name: 'Unidade do exame 1' })).toHaveValue('%');
  await exam.getByRole('textbox', { name: 'Valor do exame 1' }).fill('48,5');
  await exam.getByRole('button', { name: 'Salvar' }).click();

  const journal = page.getByRole('list', { name: 'Registros do diário' });
  await expect(journal).toContainText('Pressão 145/92 · acima de 14 por 9');
  await expect(journal).toContainText('Exame: Hematócrito 48,5 %');
  await expect(journal).toContainText('Testosterona (cipionato) · 100 mg');
  await expect(page.getByRole('region', { name: 'Exames' })).toContainText('Hematócrito');
  await page.screenshot({ path: 'test-results/protocolo.png', fullPage: true });

  // resumo para a consulta
  await page.getByRole('button', { name: 'Copiar resumo' }).click();
  await expect(page.getByRole('button', { name: 'Resumo copiado' })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Reposição (reposição hormonal, desde 16 nov 2026, semana 1)');
  expect(text).toContain('Doses registradas: 2 de 2 previstas');
  expect(text).toContain('- Hematócrito: 48,5 % em 16 nov 2026');

  // fica guardado ao recarregar
  await page.reload();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();
  await expect(page.getByRole('article', { name: 'Reposição' })).toBeVisible();

  // apagar tudo
  page.on('dialog', d => void d.accept());
  await page.getByRole('button', { name: 'Apagar todos os dados do protocolo' }).click();
  await expect(page.getByText('Nenhum protocolo ainda.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('com a aba Protocolo e o texto bem maior, as quatro abas cabem na largura (Z1)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  await page.getByRole('radiogroup', { name: 'Tamanho do texto' }).getByRole('radio', { name: 'Bem maior' }).click();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Protocolo' })).toBeVisible();
  const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(width);
  await page.getByRole('tablist').screenshot({ path: 'test-results/protocolo-abas-texto-grande.png' });
});

test('protocolo que já estava em andamento: doses anteriores marcadas, encerrar e reabrir; o que não começou não encerra (Z1)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 18, 9)); // quarta
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();

  // começou há duas semanas (4 nov, quarta), dose a cada 7 dias: 4 e 11 nov antes de hoje
  await page.getByRole('button', { name: '+ Novo' }).click();
  const editor = page.getByRole('dialog', { name: 'Novo protocolo' });
  await editor.getByRole('textbox', { name: 'Nome' }).first().fill('Em andamento');
  await editor.getByLabel('Começa em').fill('2026-11-04');
  const first = editor.getByRole('group', { name: 'Substância 1' });
  await first.getByRole('combobox', { name: 'Nome' }).fill('Substância X');
  await first.getByRole('textbox', { name: 'Dose da substância 1' }).fill('50');
  const backfill = editor.getByRole('checkbox', { name: /marcar as 2 doses de antes de hoje como feitas/ });
  await expect(backfill).toBeChecked();
  await editor.getByRole('button', { name: 'Salvar protocolo' }).click();

  const card = page.getByRole('article', { name: 'Em andamento' });
  // hoje (18 nov) é dia de dose e ainda não foi registrada
  await expect(card).toContainText('2 de 3 doses registradas até hoje');
  await expect(page.getByRole('region', { name: 'Doses sem registro' })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Registros do diário' })).toContainText('marcada ao cadastrar o protocolo');

  // encerrar e reabrir
  page.on('dialog', d => void d.accept());
  await card.getByRole('button', { name: 'Encerrar hoje' }).click();
  await expect(card.getByRole('button', { name: 'Encerrar hoje' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Reabrir' }).click();
  await expect(card.getByRole('button', { name: 'Encerrar hoje' })).toBeVisible();

  // um que ainda não começou não tem "Encerrar hoje"
  await page.getByRole('button', { name: '+ Novo' }).click();
  await editor.getByRole('textbox', { name: 'Nome' }).first().fill('Depois');
  await editor.getByLabel('Começa em').fill('2026-12-07');
  await editor.getByRole('group', { name: 'Substância 1' }).getByRole('combobox', { name: 'Nome' }).fill('Substância Y');
  await editor.getByRole('textbox', { name: 'Dose da substância 1' }).fill('10');
  await expect(editor.getByRole('checkbox', { name: /doses de antes de hoje/ })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Salvar protocolo' }).click();
  const later = page.getByRole('article', { name: 'Depois' });
  await expect(later).toContainText('Começa em 7 dez');
  await expect(later.getByRole('button', { name: 'Encerrar hoje' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
