# Lista de equivalência (P7)

Tudo o que o app atual (2.21.2) faz, conferido no app novo (`app/`). A troca (3.0.0, P8) só
acontece com todos os itens em ✅ ou em ➖ com decisão registrada, e validados no aparelho (A9).

Fontes: `CHANGELOG.md` (1.0.0 a 2.21.2), módulos em `js/`, telas do `index.html` e o TODO.
Levantamento de 04/10/2026.

Legenda: ✅ feito no app novo · 🟡 parcial · ❌ falta · ➖ não será portado (com motivo) ·
📱 falta validar no aparelho.

## Dados e migração

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| Dados guardados no aparelho (localStorage + IndexedDB) | ✅ | IndexedDB; formato novo por treino |
| Migração dos dados na primeira abertura | ✅ | cópia bruta guardada antes; testada com 2 backups reais do Carlos |
| Meta de peso sem ponto de partida gravado (alvo + primeira pesagem) | ✅ | corrigido em 04/10 após teste no aparelho |
| Backup manual (exportar JSON) | ✅ 📱 | APK pelo seletor de arquivos |
| Backup com senha (exportar) | ❌ | o app novo lê backups com senha, mas ainda não gera |
| Restaurar backup (v1, atual, com senha) | ✅ | inclui backups do app atual |
| Recuperar restauração interrompida | ✅ | a restauração no app novo é uma troca única em memória + gravação; sem estado intermediário |
| Status do último backup e lembrete para fazer backup | ❌ | no APK o backup automático cobre; no navegador falta o lembrete |
| Backup automático | ✅ 📱 | novo (O11), só APK |
| Aviso de falta de espaço ao gravar | 🟡 | a store guarda `saveError`, mas não há aviso na tela |

## Treino

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| Treino do dia carregado automaticamente | ✅ | escolha do dia com hoje em destaque |
| Séries com carga e reps, marcar feita | ✅ | |
| Pré-preenchimento pela última sessão | ✅ | |
| Botões ±0,5 / ±5 / ±10 kg | ❌ | hoje só digitação; O20 prevê botões −/+ opcionais |
| Proteção contra carga digitada errada (valor suspeito) | ❌ | |
| Adicionar/remover série, marcar todas | ✅ | |
| Cardio com minutos e km | ✅ | |
| Exercício de tempo (prancha) | ✅ | |
| Exercício opcional | ✅ | |
| Dicas do exercício e observação | ✅ | |
| Troca pela reserva do plano | ✅ | |
| Troca avulsa por qualquer exercício da biblioteca | ❌ | O15 decidiu mostrar "Trocar" só com reserva; falta a troca pela biblioteca |
| Cronômetro de descanso (tempo por exercício, auto-início, som, vibração) | ✅ 📱 | |
| Notificação de fim do descanso com o app em segundo plano | ✅ 📱 | agendada no Android ao iniciar o descanso, pelo canal de alarme; vale também com o app aberto (o bipe da página não tocava no APK) |
| Rascunho do treino em andamento (sobrevive a fechar) | ✅ | |
| Duração do treino | ✅ | |
| Finalizar incompleto com aviso (só séries marcadas) | ✅ | |
| Check-in cheio/meio, presença sem registrar | ✅ | |
| Resumo do treino (volume, calorias, recordes) | ✅ | |
| Recordes pessoais | ✅ | |
| Cards recolhem ao concluir | 🟡 | card concluído muda de cor; não recolhe |
| Bolha com nome completo do exercício | ➖ | nomes quebram linha em vez de cortar |
| Tela ligada no treino | ✅ 📱 | novo (M2) |
| Ilustrações dos exercícios | ✅ | novo (Q2) |

## Plano

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| Vários planos, escolher o ativo, excluir | ✅ | |
| Criar plano novo | ✅ | em branco ou a partir do exemplo |
| Duplicar plano | ✅ | |
| Renomear plano, descrição, horário de treino | ✅ | Plano → Planos |
| Editar dias: nome, foco, opcional, descanso | ✅ | |
| Adicionar/editar/remover/reordenar exercícios | ✅ | arrastar fica para depois |
| Busca na biblioteca (~70 exercícios) | ✅ | |
| Reservas (alternativas) do exercício | ✅ | |
| Exercício opcional no editor | ✅ | |
| Limite de 10 exercícios por dia | ✅ | |
| Dias por semana calculados | ✅ | O3 |
| Montar treino com IA: gerar prompt | ❌ | |
| Montar treino com IA: colar resposta, conferir e criar plano | ❌ | o leitor (domínio) já está portado e testado |

## Progresso e histórico

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| Histórico de treinos por data com detalhes | ✅ | |
| Desfazer treino inteiro | ✅ | "Apagar treino" |
| Corrigir um registro do histórico (editar séries) | ❌ | |
| Apagar um exercício isolado do histórico | ❌ | |
| Evolução por exercício (gráfico de carga e lista) | ❌ | |
| Volume semanal (esta semana × passada) | ❌ | |
| Calendário de treinos | ✅ | mapa de calor de 6 meses + histórico por mês |
| Contador de dias treinados no mês | ✅ | |
| Gráficos com pontos consultáveis e seletor de faixa | 🟡 | gráfico de peso simples, sem toque nem faixa (M42) |
| Histórico de peso: lista e apagar pesagem | ❌ | a ação existe, falta a tela |

## Perfil, saúde e metas

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| Cadastro inicial obrigatório (onboarding) | ❌ | o app novo abre direto; dados vêm da migração |
| Nome, nascimento, sexo, altura, atividade, % gordura | ✅ | |
| IMC com faixa e explicação | ✅ | tabela de referência da OMS ainda não |
| TMB com 3 fórmulas e gasto diário | ✅ | |
| Meta de água com copo/garrafa | ✅ | |
| Meta de peso com marcos | ✅ | |
| Aniversário | ✅ | |

## Recompensas

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| XP e níveis 1–100 | ✅ | |
| Sequência e bônus de sequência | ✅ | |
| Refeição livre (80% da semana) | ✅ | |
| Bônus da meta de água | ✅ | |
| 28 conquistas | ✅ | mesmos ids |
| Filtro de conquistas (todas/desbloqueadas/bloqueadas) | 🟡 | desbloqueadas aparecem primeiro; sem filtro |
| Os Pesos de Rock Lee (+10 kg de uma vez pelo botão) | 🟡 | a conquista existe, mas sem botões de ajuste ninguém a desbloqueia no app novo |

## App e Android

| Função do app atual | App novo | Observação |
| --- | --- | --- |
| Funciona offline (PWA / APK) | ✅ | |
| Atualização do APK pelo próprio app | ✅ 📱 | consulta diária e botão em Perfil → Sobre; mesmo AppUpdatePlugin. Só dá para testar de verdade quando houver uma release mais nova que o app instalado |
| Lembretes semanais de treino | ✅ 📱 | Perfil → Treino; horário em Plano → Planos |
| Novidades da versão e histórico de versões | ❌ | |
| Virada de dia com o app aberto | 🟡 | telas usam a hora atual; conferir check-in/água após meia-noite |
| Navegação por arrasto entre abas | ➖ | substituída pela barra de abas com botão central (N11) |
| Cabeçalho retrátil, posição de rolagem por aba | ➖ | cabeçalho não fixo no app novo; rolagem por aba a avaliar |
| Dicas de descoberta | ➖ | sem gestos escondidos para ensinar |
| Voltar do Android | ✅ 📱 | novo (O9) |
| Registro de erros | ✅ | novo (O12) |

## Resumo

Faltam (❌) para a troca, por prioridade:

1. ~~Atualização do APK pelo app~~ e ~~notificações~~: feitos em 04/10/2026 (falta validar a atualização com uma release real).
2. ~~Plano: duplicar, criar em branco, reservas e opcional no editor~~: feito em 04/10/2026.
3. **Montar treino com IA** (prompt + importar).
4. **Histórico**: editar registro, apagar exercício isolado, evolução por exercício, volume semanal, lista de pesagens.
5. **Treino**: botões de ajuste de carga (O20), troca pela biblioteca, valor suspeito.
6. **Cadastro inicial** para quem instala do zero, **novidades da versão**, backup com senha, lembrete de backup no navegador, aviso de falta de espaço.
