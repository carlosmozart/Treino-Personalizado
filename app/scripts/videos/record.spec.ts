// As cenas dos vídeos de apresentação. Cada legenda marca o começo de um trecho; a montagem
// (compor.py) usa os trechos nos vídeos de cada função e no vídeo geral.
import { expect, test } from '@playwright/test';
import { demoData, freshData } from './demo-data';
import { record } from './studio';

test('treino', async ({ browser }) => {
  await record(browser, 'treino', demoData(), async s => {
    const { page } = s;
    s.caption('A carga de hoje já está lá');
    await s.wait(900);
    await s.tap(page.getByRole('button', { name: 'Começar treino' }), { after: 2200 });

    const first = page.getByRole('article').first();
    s.caption('Marcou a série, o descanso começa sozinho');
    await s.tap(first.getByRole('button', { name: 'Série 1 feita' }), { after: 300 });
    s.mark('success');
    await s.wait(1600);
    await s.tap(page.getByRole('button', { name: '+15' }), { after: 900 });
    await s.tap(page.getByRole('button', { name: 'Pular' }), { after: 600 });

    s.caption('Drop-set, até a falha e nota na série');
    await s.tap(first.getByRole('button', { name: /^Série 2: opções/ }), { after: 2200 });
    await s.tap(page.getByRole('dialog').getByRole('button', { name: 'Fechar' }), { after: 500 });

    s.caption('Calculadora de anilhas');
    await s.tap(first.getByRole('button', { name: /^Opções de / }));
    await s.tap(page.getByRole('button', { name: 'Anilhas na barra' }), { after: 2600 });
    await s.tap(page.getByRole('dialog').getByRole('button', { name: 'Fechar' }), { after: 500 });

    s.caption('Concluiu? O resumo mostra a evolução');
    await s.tap(first.getByRole('button', { name: /^Opções de / }));
    await s.tap(page.getByRole('button', { name: 'Marcar todas as séries' }), { after: 900 });
    await s.tap(page.getByRole('button', { name: 'Concluir' }));
    await s.tap(page.getByRole('button', { name: 'Finalizar assim' }), { after: 200 });
    await expect(page.getByRole('heading', { name: 'Treino salvo' })).toBeVisible();
    s.mark('success');
    await s.wait(2200);
    await s.scroll(500, 1400);
    await s.wait(1200);
  });
});

test('plano', async ({ browser }) => {
  await record(browser, 'plano', freshData(), async s => {
    const { page } = s;
    s.caption('Seu plano em 5 toques');
    await s.wait(900);
    await s.tap(page.getByRole('button', { name: 'Montar meu plano' }), { after: 900 });
    for (const answer of ['Ganhar massa muscular', 'Na academia', '4 dias', 'De 6 meses a 2 anos', 'Não, treino quando dá']) {
      await s.tap(page.getByRole('button', { name: new RegExp(`^${answer}`) }), { before: 350, after: 650 });
    }
    await s.wait(1400);
    s.caption('Pronto: o plano monta sozinho');
    await s.scroll(350, 1000);
    await s.tap(page.getByRole('button', { name: 'Usar este plano' }), { after: 1200 });
    s.mark('success');

    s.caption('Ajuste tudo do seu jeito');
    await s.tap(page.getByRole('button', { name: 'Plano', exact: true }), { after: 1200 });
    await s.scroll(700, 1600);
    await s.wait(600);

    s.caption('155 exercícios com ilustração');
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await s.tap(page.getByRole('button', { name: 'Biblioteca' }), { after: 800 });
    await s.type(page.getByRole('textbox', { name: 'Buscar na biblioteca' }), 'supino');
    await s.wait(700);
    await s.tap(page.getByRole('dialog').getByRole('button', { name: /^Supino Reto \(Barra\)/ }), { after: 2600 });
  });
});

test('progresso', async ({ browser }) => {
  await record(browser, 'progresso', demoData(), async s => {
    const { page } = s;
    s.caption('Veja sua evolução');
    await s.wait(600);
    await s.tap(page.getByRole('button', { name: 'Progresso', exact: true }), { after: 1200 });
    await s.scroll(900, 2200);
    await s.wait(500);
    await s.scroll(900, 2200);
    await s.wait(700);

    s.caption('Peso e medidas do corpo');
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await s.tap(page.getByRole('tab', { name: 'Metas' }), { after: 1400 });
    await s.scroll(700, 1600);
    await s.tap(page.getByRole('button', { name: /^Cintura/ }), { after: 1800 });

    s.caption('Todo treino fica no histórico');
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await s.tap(page.getByRole('tab', { name: 'Histórico' }), { after: 1400 });
    await s.scroll(800, 2000);
    await s.wait(900);
  });
});

test('rpg', async ({ browser }) => {
  await record(browser, 'rpg', demoData(), async s => {
    const { page } = s;
    s.caption('Modo RPG: seus treinos viram um personagem');
    await s.wait(600);
    await s.tap(page.getByRole('button', { name: 'Perfil', exact: true }), { after: 1400 });
    await s.tap(page.getByRole('radio', { name: 'Personagem feminino' }).or(page.getByRole('button', { name: 'Personagem feminino' })), { after: 900 });
    await s.tap(page.getByRole('button', { name: 'Ligar o modo RPG' }), { after: 300 });
    s.mark('success');
    await s.wait(2000);

    s.caption('Escolha sua classe');
    await s.tap(page.getByRole('button', { name: /^Personagem:/ }), { after: 1300 });
    await s.tap(page.getByRole('button', { name: /^Espadachim/ }), { after: 700 });
    await s.tap(page.getByRole('button', { name: /^Virar / }), { after: 300 });
    s.mark('success');
    await s.wait(3500);

    s.caption('Missões e atributos do seu treino real');
    await s.scroll(800, 2200);
    await s.wait(600);
    await s.scroll(800, 2200);
    await s.wait(900);
  });
});

test('ajuda', async ({ browser }) => {
  await record(browser, 'ajuda', demoData({ tourSeen: false }), async s => {
    const { page } = s;
    s.caption('Primeira vez? Um tour de 1 minuto');
    await s.wait(900);
    await s.tap(page.getByRole('button', { name: 'Fazer o tour' }), { after: 1500 });
    for (let i = 0; i < 3; i++) await s.tap(page.getByRole('button', { name: 'Próximo' }), { before: 300, after: 1500 });
    await s.tap(page.getByRole('button', { name: 'Sair do tour' }), { after: 700 });

    s.caption('Dúvida? Toque no ? de qualquer tela');
    await s.tap(page.getByRole('button', { name: 'Ajuda: onde fica cada função' }), { after: 900 });
    await s.type(page.getByRole('searchbox', { name: 'Buscar na ajuda' }), 'backup');
    await s.tap(page.getByRole('button', { name: 'Backup dos dados' }), { after: 1600 });

    s.caption('Ele leva você até a função');
    await s.tap(page.getByRole('button', { name: 'Ir até lá' }), { after: 2800 });
  });
});
