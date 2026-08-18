[1.9.0] - 2026-08-17
Revertido
Voltamos ao modelo de arquivo único. A divisão em css/app.css + js/*.js da v1.8.0 foi desfeita a pedido — o projeto agora é novamente um único index.html autocontido (~144KB). A divisão só volta a acontecer se pedida explicitamente no futuro. Durante a remesclagem, um bug foi encontrado e corrigido: o re.sub do Python usado no script de remesclagem estava interpretando \n dentro do JS como escape de regex e inserindo quebras de linha reais no meio de uma string — corrigido trocando para concatenação direta de texto; sintaxe e testes funcionais revalidados
Adicionado
Onboarding obrigatório no primeiro acesso: tela cheia, não-dispensável, pedindo nome, data de nascimento, altura, peso, sexo (opcional) e nível de atividade antes de liberar o app. Reaproveita a lógica de saveProfile() para não duplicar código
Data de nascimento substitui o campo de idade — idade agora é sempre calculada automaticamente a partir da data cadastrada, exibida junto ao campo
Detecção de aniversário: no dia do aniversário do usuário, mostra uma mensagem de parabéns e desbloqueia a conquista "Mais um Ano de Treino" (uma vez por ano)
Taxa Metabólica Basal (TMB) e Gasto Total Estimado (TDEE): novo card na aba Perfil, usando a fórmula de Mifflin-St Jeor (peso, altura, idade, sexo) multiplicada pelo nível de atividade cadastrado, com aviso de que é uma estimativa
[1.8.0] - 2026-08-17
Alterado
Código dividido em múltiplos arquivos para facilitar manutenção. Estrutura nova:
css/app.css — todo o CSS (antes embutido no <style> do index.html)
js/01-data.js — versão do app e banco de dados semente do perfil padrão
js/02-state.js — persistência (localStorage), estado global, camada de dados dos perfis de treino, base de exercícios
js/03-profiles.js — listagem e editor de perfis de treino
js/04-checkin-nav.js — check-in semanal, navegação entre abas, notificações toast
js/05-gamification.js — XP, níveis e conquistas
js/06-health.js — IMC, água, roadmap de peso, perfil de saúde
js/07-workout.js — renderização dos exercícios do dia, ajuste de valores, geração do resumo do treino, inicialização do app
index.html caiu de ~132KB para ~27KB, referenciando os arquivos acima em ordem
sw.js atualizado para colocar todos os novos arquivos em cache (funciona offline exatamente como antes)
Nenhuma mudança de comportamento — a divisão foi 100% mecânica; toda a suíte de testes funcionais (perfis, check-in, XP, conquistas, água, IMC) foi reexecutada contra a versão dividida servida via HTTP local e passou sem erros, idêntica à versão anterior
[1.7.0] - 2026-08-16
Adicionado
Sistema de Conquistas estilo Steam (nova aba 🏆): 16 conquistas cobrindo check-ins totais, sequências, níveis, hidratação, perfis criados, registros de peso e refeições livres. Bloqueadas mostram barra de progresso (ex: "23/50"), desbloqueadas mostram a data
Bônus de sequência: +30% do XP de check-in cheio toda vez que o streak completa um ciclo inteiro dos dias/semana do perfil ativo
Prêmio de Refeição Livre: ao completar 80% dos dias de treino planejados na semana atual, libera o direito a uma refeição livre no fim de semana — com barra de progresso semanal visível na tela de treino
Suporte a peso fracionado: incrementos de ±0,5kg, além de ±5kg, e digitação livre de decimais nos campos de carga (treino e editor de perfil)
Alterado
Bônus de água mudou de valor fixo (+2 XP) para 10% do XP de check-in cheio, escalando com o perfil ativo
Ícone do app trocado pela imagem fornecida pelo usuário, com nome de arquivo versionado (v3) para forçar atualização em quem já instalou
Corrigido
Campo de nome do exercício no editor de perfil estourava a largura do card em telas estreitas (bug clássico de flexbox — faltava min-width: 0 no input flex-1)
[1.6.0] - 2026-08-16
Adicionado
Exercícios de cárdio agora têm campos próprios: tempo (min) e distância (km) no lugar de séries/reps/carga. Ao escolher um exercício do grupo "Cardio" na base (Esteira, Bicicleta Ergométrica, Elíptico, Escada, Remo), o tipo é detectado automaticamente; dá para trocar manualmente entre Força/Cardio em qualquer exercício, inclusive customizados
Histórico e resumo do treino formatados de forma diferente para cárdio (ex: "Esteira: 30min | 5km") em vez do formato de séries/carga
Alterado
Ícone do app redesenhado: trocado o ícone de halteres por um ícone de barras ascendentes com destaque dourado (tema de progresso/XP), mais legível em tamanhos pequenos
Arquivos de ícone renomeados (icon-192.png/icon-512.png → icon-192-v2.png/ icon-512-v2.png) — essa troca de nome é proposital: é o que força o Android/Chrome a buscar o ícone novo em quem já instalou o app, já que ícones de PWA instalados ficam fortemente cacheados pelo sistema e raramente atualizam sozinhos com o mesmo nome de arquivo
[1.5.0] - 2026-08-16
Adicionado
Campo "Sexo" no perfil (opcional, "prefiro não informar" disponível) — nota explícita na UI de que a fórmula/classificação do IMC (OMS) é a mesma independente do sexo; o campo existe para completude do perfil e possíveis métricas futuras
Campo "Peso Alvo (kg)" no perfil
Roadmap de progresso na aba Perfil: mostra peso inicial (primeiro registro do histórico), peso atual e peso alvo, com barra de progresso e "faltam Xkg" — funciona tanto para objetivos de perda quanto de ganho de peso
[1.4.0] - 2026-08-16
Adicionado
Gestão de múltiplos Perfis de Treino (aba "Planos"): criar, editar e excluir perfis completos, cada um com nome, descrição, dias de treino por semana e ciclo semanal próprio (Segunda a Domingo)
Base de exercícios pré-cadastrados (~70 exercícios em 10 grupos musculares) para compor os dias de cada perfil por seleção rápida, além de campo livre para exercícios personalizados
Limite de 10 exercícios por dia, com contador visual no editor
Seleção de perfil ativo, sempre lembrado entre sessões (mantém o último selecionado)
XP de check-in agora é calculado dinamicamente a partir dos dias/semana do perfil ativo (pool semanal de 600 XP dividido pelos dias definidos)
Painel de IMC expandido: texto explicativo por faixa, tabela de referência (OMS) e cálculo da faixa de peso "ideal" para a altura cadastrada, com aviso sobre a limitação do IMC para quem treina musculação
Alterado
Removidos os placeholders com dados pessoais reais dos campos de perfil (idade, altura, peso), substituídos por exemplos genéricos — o app foi pensado para ser compartilhado
Segurança / Anti-trapaça
Check-in agora só pode ser marcado/desmarcado no dia de hoje — dias passados e futuros ficam bloqueados na grade semanal, prevenindo XP obtido de forma retroativa ou antecipada
[1.3.0] - 2026-08-15
Adicionado
Sistema de XP e Níveis (1 a 100): barra de nível fixa no cabeçalho, XP calculado por check-in de treino
Check-in automático: marcar todos os exercícios do dia como concluídos gera check-in automático com XP cheio (100 XP)
Check-in manual parcial: usar "Finalizar Treino" sem ter concluído todos os exercícios concede metade do XP (50 XP); desmarcar um check-in no calendário revoga o XP concedido
Aba "Perfil": dados pessoais (nome, idade, altura, peso, nível de atividade)
Cálculo de IMC com classificação (OMS) e indicador visual
Meta de água diária calculada a partir do peso e nível de atividade, com botões de +100ml/-100ml e bônus de +2 XP ao bater a meta do dia
Histórico de peso e IMC por data, registrado automaticamente ao salvar o perfil
Observação
Gestão de múltiplos perfis de treino (dias/semana configuráveis, exercícios customizados, limite de 10 por dia) fica para a próxima versão — é uma reestruturação maior do banco de dados de treinos
Adicionado
Sistema de versionamento e este changelog
Número da versão exibido no rodapé do app
[1.1.1] - 2026-08-14
Corrigido
Cache do service worker (chassi-cache-v1 → treino-cache-v2) para garantir que atualizações publicadas no GitHub Pages realmente cheguem ao app já instalado
[1.1.0] - 2026-08-14
Alterado
Renomeado de "Projeto Chassi 80kg" para "Treino Personalizado - Hipertrofia e Emagrecimento"
Removidos termos de jargão militar/mecânico ("chassi", "torque", "blindagem", "extração", "diário de bordo", "combate", "tático") por linguagem padrão de musculação
Grade de check-in mudou de vertical/6 dias para horizontal 4+3, incluindo domingo como dia extra opcional
Adicionado
Carregamento automático do treino correspondente ao dia da semana atual
Contador de dias treinados no mês corrente
Checkbox de "concluído" em cada card de exercício
Botão de -5kg (simétrico ao +5kg já existente)
Animações de entrada nos cards, pulso no dia atual do check-in, pop ao marcar check-in/exercício concluído
[1.0.0] - 2026-08-07
Adicionado
Primeira versão como PWA instalável (manifest.json + service worker)
Persistência via localStorage (histórico de séries/reps/carga por exercício)
Sistema de check-in semanal com contador de sequência (streak)
Marcador persistente de "hora de subir carga" baseado na última sessão registrada
Plano de treino PPL 2x/semana adaptado (ênfase em peitoral inferior, restrições de joelho/escoliose, alternativas de exercício por limitação de equipamento)
