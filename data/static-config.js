// Dados estáticos compartilhados pelo app. Carregado antes da lógica em index.html.
window.TREINO_STATIC = {
  dayOrder: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
  metForca: 5.0,
  metCardioPadrao: 6.0,
  releaseNotes: [
      {
        version: '2.19.5', date: '2026-09-19',
        highlights: [
          '🗂️ <strong>Histórico preparado para crescer.</strong> O app começou a guardar as sessões em um banco local mais robusto, preservando a compatibilidade com seus backups.'
        ]
      },
      {
        version: '2.19.4', date: '2026-09-19',
        highlights: [
          '⏰ <strong>Aviso de descanso mais confiável.</strong> No Android, você pode autorizar alarmes exatos para receber o aviso no horário certo mesmo fora do app.',
          '♿ <strong>Melhorias de acessibilidade.</strong> Janelas e nomes de exercícios agora funcionam melhor com teclado e leitor de tela.'
        ]
      },
      {
        version: '2.19.3', date: '2026-09-07',
        highlights: [
          '🔔 <strong>Lembretes no Android.</strong> Ative avisos semanais para o horário do seu treino, mesmo com o app fechado.',
          '⏰ <strong>Descanso sem perder o tempo.</strong> O celular avisa quando o cronômetro terminar enquanto você estiver em outro app.'
        ]
      },
      {
        version: '2.19.2', date: '2026-09-07',
        highlights: [
          '🧭 <strong>Navegação mais estável.</strong> O cabeçalho deixa de oscilar ao rolar a página.',
          '🛡️ <strong>Backup mais protegido.</strong> A restauração agora confere também a versão do arquivo e evita arquivos excessivamente grandes.',
          '⌨️ <strong>Melhor uso no celular.</strong> Campos ficam mais seguros com o teclado aberto e os controles ganharam melhorias de acessibilidade.'
        ]
      },
      {
        version: '2.19.1', date: '2026-09-07',
        highlights: [
          '📥 <strong>Traga seus dados logo no começo.</strong> Na primeira abertura, você já pode restaurar o backup da versão web antes de preencher o cadastro.',
          '🖼️ <strong>Ícone oficial no Android.</strong> O aplicativo instalado agora usa o ícone do Meu Treino.'
        ]
      },
      {
        version: '2.19.0', date: '2026-09-07',
        highlights: [
          '📱 <strong>Preparado para Android.</strong> O app agora pode ser empacotado como aplicativo Android, mantendo seus dados no aparelho.',
          '🧭 <strong>Funcionamento mais estável no app instalado.</strong> O cache do navegador fica no site/PWA; no aplicativo Android, a versão enviada já é usada diretamente.'
        ]
      },
      {
        version: '2.18.1', date: '2026-09-07',
        highlights: [
          '🛡️ <strong>Restauração de backup mais segura.</strong> O app agora confere a estrutura do arquivo antes de substituir seus dados, evitando restaurar um backup corrompido por engano.',
          '🔄 <strong>Atualizações do app instalado mais confiáveis.</strong> A nova versão renova corretamente o cache offline.'
        ]
      },
      {
        version: '2.18.0', date: '2026-09-01',
        highlights: [
          '📥 <strong>Importar o plano da IA.</strong> Agora o caminho fecha: copie o prompt, cole numa IA, e cole a resposta de volta no app. Ele lê o plano e monta tudo — dias, exercícios, séries e repetições — sem você digitar nada.',
          '👀 <strong>Você confere antes.</strong> Nada é criado até você ver a tela com o que será montado, dia a dia, e o que o app precisou adaptar. É um plano <strong>novo</strong>: nenhum plano seu é alterado ou apagado, e você continua treinando o de sempre até trocar na lista.',
          '🔄 <strong>As alternativas viram exercício reserva.</strong> Quando a IA sugere "se este exercício incomodar o joelho, faça aquele", a sugestão vira a reserva do card — pronta no botão de trocar.',
          '🏃 <strong>Cardio importado entra como opcional</strong>, para não segurar a conclusão do treino nos dias em que você não tiver tempo.',
          '📋 Pode colar a conversa inteira, com o prompt junto — o app acha o plano de verdade sozinho.'
        ]
      },
      {
        version: '2.17.2', date: '2026-08-31',
        highlights: [
          '📋 <strong>O bloco de importação agora é pedido dentro de um bloco de código.</strong> No teste, a resposta da IA veio com o bloco todo grudado numa linha só e com os delimitadores mastigados — o chat tratou aquilo como texto comum. Dentro de um bloco de código isso não acontece.',
          '🛟 <strong>A alternativa segura passou a viajar junto.</strong> A IA já indicava, no plano, qual exercício trocar quando algum exige mais da coluna, do joelho ou do ombro — mas essa informação ficava só no texto e se perderia na importação. Agora ela vai no bloco também, e vai virar o exercício reserva de cada card.',
          '💤 Dias de descanso deixaram de entrar no bloco: um dia sem exercícios já conta como descanso no app.'
        ]
      },
      {
        version: '2.17.1', date: '2026-08-31',
        highlights: [
          '🤖 <strong>O prompt para IA ficou bem melhor.</strong> Depois de testar a resposta de uma IA de verdade, o texto passou a pedir dias da semana em vez de "Dia 1", um número único de repetições em vez de faixas como "8 a 10", e que os exercícios caibam mesmo no tempo de treino que você informou.',
          '📋 O prompt agora pede também um bloco final em formato fixo. Você não precisa fazer nada com ele — é o que vai permitir, numa próxima versão, o app importar o plano direto da resposta em vez de você digitar tudo.',
          '⚠️ <strong>Se você deixar as observações em branco</strong>, o prompt agora pede que a IA aponte os exercícios mais exigentes para coluna, joelho e ombro, e ofereça alternativa para cada um. No teste, sem observações, a IA sugeriu agachamento livre e stiff com barra para quem tem o plano adaptado a joelho — o pedido de cuidado passa a ir junto mesmo quando você não escreve nada.',
          '💬 E a tela avisa, ali mesmo, o que você perde deixando o campo vazio.'
        ]
      },
      {
        version: '2.17.0', date: '2026-08-31',
        highlights: [
          '☆ <strong>Exercício opcional.</strong> No editor do plano, cada exercício agora pode ser marcado como opcional. Ele não segura mais a conclusão do treino: nos dias em que você não fizer aquele cardio de 10 minutos, o check-in automático, o XP cheio e o registro no histórico acontecem do mesmo jeito. Se fizer, ele entra no volume e no gasto estimado normalmente.',
          '📅 <strong>Calendário de treinos.</strong> Em Perfil > Progresso, a lista que crescia sem parar ganhou um calendário em cima. Um mês inteiro cabe em cinco linhas — dias treinados aparecem em verde com o volume, dias só de cardio em azul, e é só tocar para ver o treino daquele dia. As setas voltam mês a mês até o seu primeiro registro.',
          '📜 A lista de treinos continua embaixo, agora com rolagem própria — ela não empurra mais o resto da tela para baixo.',
          '🔥 <strong>Gasto estimado por treino.</strong> Cada treino agora mostra uma estimativa de calorias, calculada com seu peso e a duração. Serve para comparar seus treinos entre si — qual dia pesou mais, se hoje rendeu menos que o normal.',
          '⚠️ A estimativa de calorias <em>não</em> serve para fechar conta de dieta: a margem de erro para uma pessoa específica é grande. O app diz isso na tela, ao lado do número.',
          '🎨 Três detalhes visuais que nunca funcionaram foram corrigidos: séries concluídas agora escurecem de verdade, as setas de reordenar exercício apagam quando não dá para mover, e o botão vermelho de confirmação reage ao toque.'
        ]
      },
      {
        version: '2.16.0', date: '2026-08-31',
        highlights: [
          '🤖 <strong>Montar treino com IA.</strong> Em <em>Planos</em>, o app junta seus dados — objetivo, dias disponíveis, seu treino atual e as cargas que você realmente usa — e monta um texto pronto para colar em qualquer IA (ChatGPT, Claude, Gemini) e receber um plano feito para o seu caso.',
          '🔒 <strong>Nada sai do aparelho sozinho.</strong> O app não conversa com IA nenhuma: ele só escreve o texto. Quem copia e cola é você. E dá para desligar os dados de saúde antes de copiar, se preferir não incluí-los.',
          '💬 O campo de observações é o que tira o plano do genérico: escreva lesões, o equipamento que sua academia tem, exercícios que você não gosta.',
          '📏 <strong>Escolha quanto o gráfico mostra.</strong> Em cima de cada gráfico apareceu <em>Mostrar: 5 · 7 · Tudo</em>. Com muitos registros a linha virava um emaranhado e as variações recentes ficavam espremidas — agora dá para olhar só as últimas semanas ou o histórico inteiro.',
          'ℹ️ A escolha vale por gráfico e fica guardada: o que você escolher em peso não mexe no de volume semanal.'
        ]
      },
      {
        version: '2.15.1', date: '2026-08-31',
        highlights: [
          '📍 <strong>Os gráficos agora respondem ao toque.</strong> Toque em qualquer ponto do gráfico de peso e IMC e ele mostra a data e os valores daquele registro. Antes a linha mostrava a tendência, mas não dava para saber a que dia cada subida ou queda correspondia.',
          '📊 <strong>Vale para todos os gráficos:</strong> peso e IMC, volume semanal e evolução de cada exercício. No de peso aparece a data com o peso e o IMC; no semanal, o período com o volume e o número de treinos; no do exercício, a data com as séries e a carga daquele dia.',
          '👆 Não precisa acertar a bolinha: toque em qualquer lugar do gráfico e ele mostra o registro mais próximo, com o ponto destacado para você saber qual é.'
        ]
      },
      {
        version: '2.15.0', date: '2026-08-27',
        highlights: [
          '📊 <strong>Volume semanal</strong> em Perfil > Progresso: quanto você levantou nesta semana, na semana passada, e a variação entre elas. É a escala que mostra progressão de verdade — uma sessão isolada varia por sono e humor, mas a soma da semana revela tendência.',
          '📈 Gráfico das <strong>últimas 8 semanas</strong>, para ver se a carga vem subindo, estável ou caindo ao longo do tempo.',
          'ℹ️ Semanas em que você não treinou aparecem como zero em vez de sumirem — uma pausa é informação sobre seu treino, não ausência de dado.'
        ]
      },
      {
        version: '2.14.1', date: '2026-08-27',
        highlights: [
          '⚡ <strong>App 15 KB mais leve.</strong> As notas de versão antigas continuavam embarcadas no app mesmo sem aparecer em lugar nenhum — 32 versões acumuladas, das quais a tela mostra 5. Agora só as recentes viajam junto, e o histórico completo segue registrado no repositório.'
        ]
      },
      {
        version: '2.14.0', date: '2026-08-26',
        highlights: [
          '📐 <strong>Card do exercício mais enxuto.</strong> Antes cada exercício ocupava quase a tela inteira e um treino de 4 exercícios exigia mais de 5 telas de rolagem. Agora sobra espaço para ver o próximo exercício sem rolar tanto.',
          '📈 <strong>Um aviso no lugar de dois.</strong> O card mostrava a referência da última sessão E um segundo aviso avaliando as mesmas repetições logo abaixo — dois blocos dizendo a mesma coisa. Agora é um só, com a sugestão acompanhando o que você registra na hora.',
          '💡 <strong>A dica do exercício ficou recolhida.</strong> Toque em "Ver dica deste exercício" quando precisar — ela continua ali, só não ocupa espaço o tempo todo.',
          '✏️ <strong>Observações agora abrem sob demanda.</strong> Toque em "Adicionar observação" para escrever. Se você já tiver escrito algo, o campo aparece preenchido normalmente.'
        ]
      },
      {
        version: '2.13.1', date: '2026-08-25',
        highlights: [
          '🐛 <strong>Corrigido de verdade: treinos não apareciam em "Treinos realizados".</strong> O registro no histórico só acontecia ao tocar em <em>Finalizar Treino</em>. Se você marcava todas as séries e considerava o treino encerrado — o app já dava o check-in, o XP e dizia "Treino completo!" — nada era gravado no histórico. Agora concluir todos os exercícios registra o treino automaticamente.',
          'ℹ️ O botão <em>Finalizar Treino</em> continua existindo e serve para gerar o resumo copiável, mas deixou de ser obrigatório para o treino entrar no histórico.',
          '⚠️ Treinos de dias anteriores que não foram finalizados pelo botão não podem ser recuperados — eles nunca chegaram a ser gravados. A partir desta versão isso não acontece mais.'
        ]
      },
      {
        version: '2.13.0', date: '2026-08-25',
        highlights: [
          '🐛 <strong>Corrigido: o treino de hoje não aparecia no histórico.</strong> A lista de treinos realizados só era montada ao ENTRAR na aba Perfil — navegar entre Dados, Saúde e Progresso reexibia a versão antiga, e finalizar um treino não avisava a tela. Agora ela é remontada sempre que você abre Progresso, ao finalizar um treino e ao voltar para o app.',
          '🔴 <strong>Novas conquistas por volume levantado:</strong> Kaioken (10.000 kg), Kaioken x3 (30.000 kg), Kaioken x10 (100.000 kg) e Super Saiyajin (1.000.000 kg). O volume de todos os seus treinos já registrados conta desde já — algumas podem desbloquear assim que você abrir o app.',
          '💬 <strong>Nomes longos de exercício agora podem ser lidos por inteiro.</strong> Toque no nome cortado no card e uma bolha mostra o texto completo. Vale também no detalhe do dia.'
        ]
      },
      {
        version: '2.12.0', date: '2026-08-25',
        highlights: [
          '✏️ <strong>Agora dá para corrigir o que já foi registrado.</strong> Toque no lápis em qualquer sessão — no histórico do exercício (📊 Evolução) ou no detalhe do dia — para ajustar repetições e carga, adicionar ou remover séries. Até hoje um valor digitado errado ficava para sempre, virava recorde pessoal e distorcia seu gráfico.',
          '🗑️ <strong>Apagar um registro isolado</strong> sem perder o resto do treino daquele dia.',
          '↩️ <strong>Desfazer um treino inteiro.</strong> Finalizou por engano? O botão no detalhe do dia remove os exercícios registrados, o check-in e devolve o XP concedido.',
          '⚖️ <strong>Apagar um registro do histórico de peso</strong>, pelo mesmo motivo.',
          'ℹ️ Ao corrigir um registro antigo, ele passa a ser gravado no formato por série — os valores foram vistos e confirmados por você, então a conversão é segura.'
        ]
      },
      {
        version: '2.11.0', date: '2026-08-25',
        highlights: [
          '💾 <strong>Antes de tudo: exporte um backup.</strong> Esta versão muda a forma como os treinos são gravados. Seus registros antigos continuam intactos e nada precisa ser convertido — mas como é a maior mudança de dados até hoje, vale a garantia. Perfil > Dados > Exportar Backup.',
          '🔢 <strong>Cada série tem suas próprias repetições e carga.</strong> Antes o app gravava um valor para o exercício inteiro: um treino em pirâmide (12/10/8) virava "3x10", um número que não correspondia a nenhuma série real. Agora você registra série por série, e o histórico mostra "12/10/8 · 40kg".',
          '📊 <strong>Volume total agora é exato.</strong> Em vez de multiplicar uma média, o app soma o trabalho de cada série. Se você baixou a carga na última, isso aparece na conta.',
          '🏅 <strong>Recorde pessoal considera sua melhor série</strong> — não mais um valor médio do exercício.',
          '🤔 <strong>Proteção contra erro de digitação.</strong> Se você digitar uma carga muito acima do seu histórico naquele exercício, o app pergunta antes de aceitar. Um 600 no lugar de 60 viraria recorde e achataria seu gráfico para sempre.',
          'ℹ️ Os treinos que você já registrou continuam aparecendo normalmente. Eles não são convertidos de propósito: transformar "3x10" em três séries iguais inventaria uma uniformidade que talvez nunca tenha existido.'
        ]
      },
      {
        version: '2.10.1', date: '2026-08-25',
        highlights: [
          '🐛 <strong>Corrigido: treino finalizado sumia do histórico.</strong> Um registro antigo com data inválida no seu histórico fazia a finalização falhar no meio — o app mostrava o treino como concluído, mas ele nunca chegava à lista de treinos realizados. Agora um registro problemático não derruba mais o resto, e o app avisa se algum exercício não puder ser gravado.',
          '🐛 <strong>Corrigido: treinos fora de ordem no histórico.</strong> Tinha a mesma origem — registros com data em formato inesperado bagunçavam a ordenação. Esses registros antigos foram limpos automaticamente nesta atualização.',
          '🎯 <strong>Avisos agora aparecem sempre centralizados.</strong> Antes ficavam presos à direita, e como a largura depende do tamanho do texto, pareciam mudar de lugar a cada mensagem.'
        ]
      },
      {
        version: '2.10.0', date: '2026-08-24',
        highlights: [
          '📈 <strong>Agora você sempre vê o que fez da última vez.</strong> Antes essa informação só aparecia quando você tinha passado de 10 repetições — ou seja, na faixa de 6 a 10, que é a mais comum, o card não mostrava nada. Agora a referência aparece sempre ("Última vez: 4x9 com 60kg"), com a dica mudando conforme o resultado.',
          '🔍 <strong>Trocar exercício por qualquer um da biblioteca, no meio do treino.</strong> Aparelho ocupado e sem reserva cadastrada? Toque na lupa do exercício e busque outro. A troca vale só para o treino de hoje — seu plano continua intacto. Se o exercício escolhido já tem histórico, a carga anterior vem preenchida.',
          '⏱️ <strong>Duração do treino registrada automaticamente.</strong> O app marca quando você começou (na primeira série ou ajuste) e quanto tempo levou até finalizar. Aparece no resumo, na lista de treinos e no detalhe do dia.'
        ]
      },
      {
        version: '2.9.3', date: '2026-08-24',
        highlights: [
          '📴 <strong>Funcionamento sem internet verificado.</strong> O app foi testado com a conexão totalmente cortada: abre, registra treino, cronômetro, gráficos, histórico e backup — tudo funciona igual. Ele não depende de nada da internet para rodar.',
          '🔧 Corrigido um erro interno que aparecia quando o app era aberto sem conexão. Não afetava o uso, mas era registrado como falha.'
        ]
      },
      // Historico completo das versoes fica no CHANGELOG.md do repositorio. Aqui ficam
      // apenas as ultimas 8: o array e baixado junto com o app a cada atualizacao, e as
      // 32 entradas acumuladas somavam 22,6 KB de texto que a tela nunca exibia
      // (RELEASE_NOTES_NA_TELA mostra 5).

    ],
  exerciseLibrary: {
      'Peito': ['Supino Reto (Barra)', 'Supino Reto (Halteres)', 'Supino Inclinado (Barra)', 'Supino Inclinado (Halteres)', 'Supino Declinado (Máquina)', 'Supino Articulado', 'Crossover (Polia Alta)', 'Crossover (Polia Baixa)', 'Peck Deck (Voador)', 'Flexão de Braço (Solo)', 'Paralelas / Mergulho (Dips)', 'Crucifixo com Halteres'],
      'Costas': ['Puxada Frontal (Polia)', 'Puxada Triângulo', 'Barra Fixa (Pull-up)', 'Remada Baixa (Polia)', 'Remada Curvada (Barra)', 'Remada Cavalinho', 'Remada Unilateral (Halter)', 'Remada Máquina', 'Pulldown (Corda)', 'Levantamento Terra', 'Pullover'],
      'Ombro': ['Desenvolvimento Militar (Barra)', 'Desenvolvimento com Halteres', 'Desenvolvimento Máquina', 'Elevação Lateral (Halteres)', 'Elevação Lateral (Polia)', 'Elevação Frontal', 'Crucifixo Invertido (Máquina)', 'Face Pull', 'Encolhimento (Trapézio)'],
      'Bíceps': ['Rosca Direta (Barra)', 'Rosca Direta (Polia)', 'Rosca Alternada (Halteres)', 'Rosca Martelo', 'Rosca Scott (Barra W)', 'Rosca Scott Máquina', 'Rosca Concentrada', 'Rosca 21'],
      'Tríceps': ['Tríceps Pulley (Corda)', 'Tríceps Pulley (Barra)', 'Tríceps Testa (Barra/Halteres)', 'Tríceps Francês', 'Mergulho no Banco', 'Tríceps Coice (Halter)', 'Supino Fechado'],
      'Pernas (Quadríceps)': ['Agachamento Livre', 'Leg Press 45º', 'Cadeira Extensora', 'Agachamento Smith', 'Afundo (Passada)', 'Agachamento Búlgaro', 'Hack Squat'],
      'Pernas (Posterior/Glúteo)': ['Stiff (Halteres/Barra)', 'Levantamento Terra Romeno', 'Mesa Flexora', 'Cadeira Flexora', 'Elevação Pélvica (Hip Thrust)', 'Cadeira Abdutora', 'Cadeira Adutora', 'Glúteo na Polia (Coice)'],
      'Panturrilha': ['Panturrilha em Pé', 'Panturrilha Sentado', 'Panturrilha no Leg Press'],
      'Abdômen / Core': ['Abdominal Crunch (Máquina)', 'Abdominal na Polia', 'Prancha Isométrica', 'Elevação de Pernas', 'Abdominal Infra', 'Rotação de Tronco (Máquina)', 'Roda Abdominal'],
      'Cardio': ['Esteira', 'Bicicleta Ergométrica', 'Elíptico', 'Escada (StairMaster)', 'Remo (Máquina)']
    }
};

