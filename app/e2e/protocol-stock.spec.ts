import { expect, test } from '@playwright/test';

test('estoque do frasco: informar ao abrir, descontar a dose do dia e trocar por um frasco novo (Z7)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 23, 10)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Protocolo' }).click();

  // 100 mg por semana, frasco de 250 mg/ml: 0,4 ml por dose
  await page.getByRole('button', { name: '+ Novo' }).click();
  const editor = page.getByRole('dialog', { name: 'Novo protocolo' });
  await editor.getByRole('textbox', { name: 'Nome' }).first().fill('Ciclo');
  const first = editor.getByRole('group', { name: 'Substância 1' });
  await first.getByRole('combobox', { name: 'Nome' }).fill('Substância E');
  await first.getByRole('textbox', { name: 'Dose da substância 1' }).fill('100');
  await first.getByRole('textbox', { name: 'Concentração da substância 1 em mg por ml' }).fill('250');
  await editor.getByRole('button', { name: 'Salvar protocolo' }).click();

  const stock = page.getByRole('region', { name: 'Estoque' });
  await expect(stock).toContainText('Não informado');
  await stock.getByRole('button', { name: 'Informar o frasco de Substância E' }).click();
  const sheet = page.getByRole('dialog', { name: 'Frasco de Substância E' });
  await sheet.getByRole('textbox', { name: 'Quanto tem ao abrir, em ml' }).fill('2');
  await sheet.getByLabel('Dia em que abriu').fill('2026-11-22');
  await sheet.getByRole('button', { name: 'Salvar' }).click();
  await expect(stock.getByTestId('estoque')).toContainText('Restam 2 ml · 5 aplicações · dá até 21 dez');

  // a dose de hoje sai do frasco
  await page.getByRole('region', { name: 'Doses de hoje' }).getByRole('button', { name: 'Registrar Substância E' }).click();
  await page.getByRole('dialog', { name: 'Registrar Substância E' }).getByRole('button', { name: 'Salvar dose' }).click();
  await expect(stock.getByTestId('estoque')).toContainText('Restam 1,6 ml · 4 aplicações · dá até 21 dez');
  await stock.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await stock.screenshot({ path: 'test-results/protocolo-estoque.png' });

  // frasco novo de 10 ml aberto hoje, depois da dose: ela veio do anterior; cobre as 11 doses que faltam das 12 semanas
  await stock.getByRole('button', { name: 'Frasco novo de Substância E' }).click();
  await sheet.getByRole('textbox', { name: 'Quanto tem ao abrir, em ml' }).fill('10');
  await sheet.getByRole('button', { name: 'Salvar' }).click();
  await expect(stock.getByTestId('estoque')).toContainText('Restam 10 ml · 25 aplicações · dá até o fim do protocolo');
  expect(errors).toEqual([]);
});
