import { expect, test } from '@playwright/test';

test('corrigir dose e registro do diário (Z6); lembrar de refazer os exames, com aviso no Início (Z5)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 19, 10));
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();

  // uma dose avulsa e uma pressão para corrigir
  await page.getByRole('button', { name: '+ Dose avulsa' }).click();
  const loose = page.getByRole('dialog', { name: 'Registrar dose' });
  await loose.getByRole('combobox', { name: 'O quê' }).fill('Substância C');
  await loose.getByRole('textbox', { name: 'Dose' }).fill('50');
  await loose.getByRole('radio', { name: 'Glúteo esquerdo' }).click();
  await loose.getByRole('button', { name: 'Salvar dose' }).click();
  await page.getByRole('button', { name: '+ Pressão' }).click();
  const bp = page.getByRole('dialog', { name: 'Pressão' });
  await bp.getByRole('textbox', { name: 'Pressão máxima (sistólica)' }).fill('150');
  await bp.getByRole('textbox', { name: 'Pressão mínima (diastólica)' }).fill('95');
  await bp.getByRole('button', { name: 'Salvar' }).click();

  const journal = page.getByRole('list', { name: 'Registros do diário' });
  await journal.getByRole('button', { name: 'Corrigir dose de Substância C de 19 nov' }).click();
  const fix = page.getByRole('dialog', { name: 'Corrigir dose de Substância C' });
  await expect(fix.getByRole('textbox', { name: 'Dose' })).toHaveValue('50');
  await expect(fix.getByRole('radio', { name: 'Glúteo esquerdo' })).toHaveAttribute('aria-checked', 'true');
  await fix.getByRole('textbox', { name: 'Dose' }).fill('75');
  await fix.getByRole('radio', { name: 'Coxa direita' }).click();
  await fix.getByLabel('Dia').fill('2026-11-18');
  await fix.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(journal).toContainText('Substância C · 75 mg');
  await expect(journal).toContainText('18 nov · IM · coxa direita · avulsa');

  await journal.getByRole('button', { name: 'Corrigir registro de 19 nov' }).click();
  const fixBp = page.getByRole('dialog', { name: 'Corrigir: pressão' });
  await expect(fixBp.getByRole('textbox', { name: 'Pressão máxima (sistólica)' })).toHaveValue('150');
  await fixBp.getByRole('textbox', { name: 'Pressão máxima (sistólica)' }).fill('128');
  await fixBp.getByRole('textbox', { name: 'Pressão mínima (diastólica)' }).fill('82');
  await fixBp.getByRole('button', { name: 'Salvar' }).click();
  await expect(journal).toContainText('Pressão 128/82');
  await expect(journal).not.toContainText('acima de 14 por 9');

  // exame de outubro e lembrete a cada 6 semanas: já passou
  const exams = page.getByRole('region', { name: 'Exames' });
  await exams.getByRole('combobox', { name: 'Refazer os exames a cada' }).selectOption('6');
  await expect(exams.getByTestId('proximo-exame')).toHaveText('Registre o primeiro exame para o app saber quando lembrar.');
  await page.getByRole('button', { name: '+ Exame' }).click();
  const exam = page.getByRole('dialog', { name: 'Exame de sangue' });
  await exam.getByLabel('Dia').fill('2026-10-01');
  await exam.getByRole('combobox', { name: 'Exame 1' }).fill('Hematócrito');
  await exam.getByRole('textbox', { name: 'Valor do exame 1' }).fill('46');
  await exam.getByRole('button', { name: 'Salvar' }).click();
  await expect(exams.getByTestId('proximo-exame')).toHaveText('Passou da hora: o último foi em 1 out, há mais de 6 semanas.');
  await exams.screenshot({ path: 'test-results/protocolo-exames-intervalo.png' });

  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Exames de sangue' })).toContainText('Hora de refazer os exames');

  // com 12 semanas, a data fica à frente e o aviso do Início some
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();
  await exams.getByRole('combobox', { name: 'Refazer os exames a cada' }).selectOption('12');
  await expect(exams.getByTestId('proximo-exame')).toHaveText('Próximo: até 24 dez (em 35 dias).');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Exames de sangue' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
