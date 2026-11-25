import { expect, test, type Page } from '@playwright/test';

/** Plano do zero com os exercícios na segunda; a carga do primeiro fica em `kg`. */
async function scratchPlan(page: Page, names: string[], kg: string) {
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Criar do zero' }).click();
  await page.getByRole('button', { name: 'Criar plano e adicionar exercícios' }).click();
  const monday = page.getByRole('article', { name: 'Segunda' });
  await monday.getByRole('button', { name: 'Adicionar exercício' }).click();
  const sheet = page.getByRole('dialog');
  for (const n of names) {
    await sheet.getByRole('textbox', { name: 'Nome do exercício' }).fill(n);
    await sheet.getByRole('button', { name: n }).first().click();
  }
  await sheet.getByRole('button', { name: /^Pronto/ }).click();
  // o último adicionado fica aberto; o primeiro abre com um toque
  const field = monday.getByRole('textbox', { name: `Carga (kg) de ${names[0]}` });
  if (!(await field.isVisible())) await monday.getByRole('button', { name: new RegExp(`^${names[0]!.replace(/[()]/g, '\\$&')}`) }).click();
  await field.fill(kg);
  await page.waitForTimeout(400);
  return monday;
}

async function startToday(page: Page) {
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
}

test('no treino: salvar no plano (séries, reps fora da faixa, aquecimento), travar a carga e tirar do plano', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18)); // segunda
  await page.goto('/');
  await scratchPlan(page, ['Supino Reto (Barra)', 'Rosca Direta (Barra)'], '60');
  await startToday(page);

  const supino = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  const ask = supino.getByRole('group', { name: 'Salvar no plano' });
  // uma série a mais
  await supino.getByRole('button', { name: 'Opções de Supino Reto (Barra)' }).click();
  await page.getByRole('button', { name: 'Adicionar série', exact: true }).click();
  await expect(ask).toContainText('Salvar 4 séries no plano (hoje o plano tem 3)?');
  await ask.getByRole('button', { name: 'Salvar no plano' }).click();
  await expect(ask).toHaveCount(0);
  // repetições fora da faixa (o plano tem 10)
  await supino.getByRole('textbox', { name: 'Reps da série 1' }).fill('15');
  await supino.getByRole('textbox', { name: 'Carga da série 2' }).focus();
  await expect(ask).toContainText('Salvar 15 repetições no plano?');
  await page.screenshot({ path: 'test-results/salvar-no-plano.png' });
  await ask.getByRole('button', { name: 'Só hoje' }).click();
  // aquecimento
  await supino.getByRole('button', { name: 'Opções de Supino Reto (Barra)' }).click();
  await page.getByRole('button', { name: 'Adicionar série de aquecimento' }).click();
  await expect(ask).toContainText('Começar Supino Reto (Barra) sempre com 1 série de aquecimento?');
  await ask.getByRole('button', { name: 'Salvar no plano' }).click();
  // travar a carga
  await supino.getByRole('button', { name: 'Opções de Supino Reto (Barra)' }).click();
  await page.getByRole('button', { name: 'Travar a carga em 60 kg' }).click();
  await expect(supino.getByText('Carga travada')).toBeVisible();
  // cadeado ao lado do nome e no rótulo da carga
  await expect(supino.getByRole('heading').getByRole('img', { name: 'carga travada' })).toBeVisible();
  await expect(supino.getByRole('group', { name: /^Ajustar a carga/ }).getByRole('img', { name: 'carga travada' })).toBeVisible();

  // tirar a rosca do treino e do plano
  const rosca = page.getByRole('article', { name: 'Rosca Direta (Barra)' });
  await rosca.getByRole('button', { name: 'Opções de Rosca Direta (Barra)' }).click();
  await page.getByRole('button', { name: 'Tirar do treino' }).click();
  await page.getByRole('button', { name: 'Do treino e do plano' }).click();
  await expect(page.getByRole('article', { name: 'Rosca Direta (Barra)' })).toHaveCount(0);
  await page.waitForTimeout(400);

  // o plano ficou com 4 séries, 10 reps, a carga travada e 1 aquecimento; sem a rosca
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  const monday = page.getByRole('article', { name: 'Segunda' });
  await expect(monday.getByText('4 × 10 · 60 kg · 1 aquec.')).toBeVisible();
  // o cadeado no exercício do plano, só no supino
  await expect(monday.getByRole('img', { name: 'carga travada' })).toHaveCount(1);
  await monday.screenshot({ path: 'test-results/plano-cadeado.png' });
  await expect(monday.getByText('Rosca Direta (Barra)')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('check-in do dia num dia puxado: mais leve, fora da progressão; depois o treino vira um plano novo (W1, W2)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 16, 18)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: /^Durante o treino/ }).click();
  await page.getByRole('switch', { name: /^Check-in do dia ao começar o treino/ }).check();
  await scratchPlan(page, ['Supino Reto (Barra)'], '60');
  await startToday(page);

  const form = page.getByRole('region', { name: 'Como você está hoje' });
  await form.getByRole('radio', { name: 'Sono: 1' }).click();
  await form.getByRole('radio', { name: 'Energia: 2' }).click();
  await page.screenshot({ path: 'test-results/check-in-do-dia.png' });
  await form.getByRole('button', { name: 'Pronto' }).click();
  await expect(page.getByRole('heading', { name: 'Dia puxado. Quer ir mais leve hoje?' })).toBeVisible();
  await page.getByRole('button', { name: '10% a menos na carga' }).click();
  await expect(page.getByText('Treino mais leve hoje:')).toBeVisible();
  const supino = page.getByRole('article', { name: 'Supino Reto (Barra)' });
  await expect(supino.getByRole('textbox', { name: 'Carga da série 1' })).toHaveValue('52,5');
  await supino.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.getByText(/mais leve/).first()).toBeVisible();

  // W1: o treino feito vira um plano novo, pelo Plano
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Planos' }).click();
  await page.getByRole('button', { name: 'Novo plano a partir de um treino feito' }).click();
  await page.getByRole('button', { name: /^Treino A · / }).click();
  await page.getByRole('button', { name: /^Criar um plano novo com este treino/ }).click();
  await expect(page.getByText('Treino A', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('article', { name: 'Segunda' }).getByText('Supino Reto (Barra)')).toBeVisible();
  expect(errors).toEqual([]);
});
