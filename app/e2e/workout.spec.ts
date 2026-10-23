import { expect, test } from '@playwright/test';

test('treino completo: plano de exemplo, marcar séries, descanso, sobreviver ao recarregar e finalizar', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();

  // começa o primeiro dia da lista (hoje)
  await page.getByRole('button', { name: /^Começar / }).first().click();
  const first = page.getByRole('article').first();
  await expect(first.getByText('Série')).toBeVisible();
  await page.screenshot({ path: 'test-results/treino-ativo.png', fullPage: false });

  await first.getByRole('textbox', { name: 'Carga da série 1' }).fill('42,5');
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(first.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByText(/1\/\d+ séries/)).toBeVisible();

  // o treino em andamento sobrevive a recarregar a página
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  const again = page.getByRole('article').first();
  await expect(again.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  await expect(again.getByRole('textbox', { name: 'Carga da série 1' })).toHaveValue('42,5');

  // menu ⋯: marcar todas as séries
  await again.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Marcar todas as séries' }).click();
  // concluído recolhe para uma linha; toque reabre
  await expect(page.getByRole('button', { name: /, concluído\. Abrir$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByText(/Treino incompleto/)).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar assim' }).click();
  await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  await expect(page.getByText('Check-in feito: +50 XP (meio, treino incompleto)')).toBeVisible();
  await page.screenshot({ path: 'test-results/treino-resumo.png' });
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Progresso' }).getByRole('definition').nth(2)).toHaveText('1');
  await expect(page.getByLabel('Esta semana').getByRole('listitem', { name: /, treinou, hoje$/ })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('ilustração do exercício aparece, abre as duas posições com crédito e pode ser escondida', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar Segunda/ }).click();
  const card = page.getByRole('article', { name: 'Supino Declinado (Máquina)' });
  const thumb = card.getByRole('button', { name: 'Ver ilustração de Supino Declinado (Máquina)' });
  await expect(thumb.locator('svg')).toBeVisible();
  await page.screenshot({ path: 'test-results/treino-ilustracao.png' });
  await thumb.click();
  await expect(page.getByText(/Everkinetic.*CC BY-SA 4\.0/)).toBeVisible();
  await expect(page.getByRole('dialog').locator('svg')).toHaveCount(3); // 2 posições + ícone de fechar
  await page.screenshot({ path: 'test-results/treino-ilustracao-aberta.png' });
  await page.getByRole('button', { name: 'Fechar' }).click();
  await card.getByRole('button', { name: /^Opções de / }).click();
  await page.getByRole('button', { name: 'Esconder ilustrações' }).click();
  await expect(thumb).toHaveCount(0);
});

test('início: começar pelo cartão de hoje, registrar peso e água', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: '+ Registrar' }).click();
  await page.getByRole('textbox', { name: 'Peso de hoje em kg' }).fill('82,4');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('region', { name: 'Peso' })).toContainText('82,4 kg');
  await page.screenshot({ path: 'test-results/inicio.png', fullPage: true });
  const start = page.getByRole('button', { name: 'Começar treino' });
  if (await start.isVisible()) {
    await start.click();
    await expect(page.getByRole('button', { name: 'Concluir' })).toBeVisible();
    await page.getByRole('button', { name: 'Início', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continuar treino' })).toBeVisible();
  }
});

test('treino salvo: compartilhar como imagem, com recorde (S9)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  // o navegador do teste não tem a folha de compartilhamento: guarda o arquivo que iria para ela
  await page.addInitScript(() => {
    const w = window as unknown as { shared?: File[] };
    Object.assign(navigator, {
      canShare: (d: { files?: File[] }) => !!d.files?.length,
      share: async (d: { files: File[] }) => { w.shared = d.files; }
    });
  });
  const finishAll = async () => {
    for (let i = 0; i < 8; i++) {
      const options = page.getByRole('button', { name: /^Opções de / }).first();
      if (!(await options.isVisible())) break;
      await options.click();
      await page.getByRole('button', { name: 'Marcar todas as séries' }).click();
    }
    await page.getByRole('button', { name: 'Concluir' }).click();
    await page.getByRole('button', { name: /^Finalizar (treino|assim)$/ }).click();
    await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
  };

  await page.clock.setFixedTime(new Date(2026, 9, 15, 18)); // quinta
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await finishAll();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // uma semana depois, mais carga no primeiro exercício: recorde
  await page.waitForTimeout(400); // a gravação dos dados é adiada um instante
  await page.clock.setFixedTime(new Date(2026, 9, 22, 18));
  await page.reload();
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('textbox', { name: 'Carga da série 1' }).fill('80');
  await finishAll();
  await expect(page.getByText(/^Recorde:/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Compartilhar como imagem' }).click();
  await expect(page.getByRole('button', { name: 'Compartilhar como imagem' })).toBeEnabled();
  const file = await page.evaluate(() => {
    const f = (window as unknown as { shared?: File[] }).shared?.[0];
    if (!f) return null;
    // mostra a imagem gerada na página para a captura de tela do teste
    const img = document.createElement('img');
    img.id = 'imagem-compartilhada';
    img.src = URL.createObjectURL(f);
    img.style.cssText = 'position:fixed;inset:0;z-index:9999;width:100%;height:auto;background:#000';
    document.body.append(img);
    return { name: f.name, type: f.type, size: f.size };
  });
  expect(file).toMatchObject({ name: 'treino-2026-10-22.png', type: 'image/png' });
  expect(file!.size).toBeGreaterThan(10_000);
  const img = page.locator('#imagem-compartilhada');
  await expect(img).toHaveJSProperty('complete', true);
  await img.screenshot({ path: 'test-results/treino-imagem.png' });
  expect(errors).toEqual([]);
});

test('modo foco: próximo pula os concluídos, prancha avança sozinha, peso do corpo sem botões de carga (T3, T4, T5)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 9, 19, 10)); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Em casa 3×' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('button', { name: 'Um exercício por vez' }).click();
  const markAll = async () => {
    await page.getByRole('button', { name: /^Opções de / }).click();
    await page.getByRole('button', { name: 'Marcar todas as séries' }).click();
  };

  // T5: flexão (peso do corpo, sem carga) não mostra os botões de carga; o agachamento mostra
  await expect(page.getByRole('group', { name: /^Ajustar a carga .* Agachamento Livre$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Ir para Flexão de Braço/ }).click();
  await expect(page.getByRole('heading', { name: /Flexão de Braço/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Ajustar a carga/ })).toHaveCount(0);

  // T3: com o 2 feito, terminar o 1 e tocar em Próximo vai ao 3
  await markAll();
  await page.getByRole('button', { name: /^Ir para Agachamento Livre/ }).click();
  await markAll();
  await page.getByRole('button', { name: 'Próximo exercício' }).click();
  await expect(page.getByText('Exercício 3/8')).toBeVisible();

  // T4: prancha concluída, o fim do descanso (aqui, Pular) traz o próximo pendente
  await page.getByRole('button', { name: /^Ir para Prancha Isométrica/ }).click();
  for (const n of [1, 2, 3]) await page.getByRole('button', { name: `Série ${n} feita` }).click();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
  await expect(page.getByText('Exercício 7/8')).toBeVisible();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByText('Exercício 8/8')).toBeVisible();
  expect(errors).toEqual([]);
});
