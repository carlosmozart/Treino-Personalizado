# Changelog — Treino Personalizado

## [2.10.1] - 2026-08-25
### Corrigido
- **Treino finalizado nao entrava no historico** (relatado em uso real). `recordSession()`
  ordenava a lista com `a.date.localeCompare(b.date)`; bastava **uma** entrada antiga sem
  `date` no log daquele exercicio para o comparador receber `undefined` e lancar TypeError.
  A excecao subia pelo `forEach` de `finalizeWorkout()` e abortava a funcao **antes** dos
  `saveJSON()` — reproduzido em teste: com 4 entradas corrompidas, apenas 1 dos 4 exercicios
  foi processado, `treino_session_log` nao foi gravado no disco e o relatorio nem chegou a
  ser exibido. Do lado do usuario, o treino aparecia concluido na tela mas sumia do historico
- **Treinos fora de ordem na lista** — mesma origem. `entryDateKey()` normaliza a data
  (aceita string ou `Date`, descarta o resto) e `compareByDate()` substitui `localeCompare`
  por comparacao direta de string, que e o correto para datas ISO e nao quebra com valores
  inesperados. Aplicado tambem ao historico de peso corporal, que tinha a mesma fragilidade
- `finalizeWorkout()` passou a isolar cada exercicio em `try/catch`: uma falha pontual nao
  impede os demais de serem gravados, e os nomes afetados sao informados por toast em vez de
  o treino desaparecer em silencio
- `sanitizeSessionLog()` remove uma unica vez os registros sem data ja existentes, que nunca
  apareciam no historico e so serviam para quebrar a ordenacao e a finalizacao

### Alterado
- **Toast centralizado** (relatado como "ora aparece a esquerda, ora a direita"). O elemento
  era ancorado por `right-6`, entao a posicao visual dependia da largura do texto: mensagens
  curtas ficavam no canto direito e mensagens longas se esticavam quase ate a borda esquerda.
  Passa a ser fixado no centro por CSS proprio (`left: 50%` + `translateX(-50%)`), com
  `width: max-content` e `max-width` limitado. A animacao de entrada usa a classe `toast-in`,
  que anima apenas o eixo Y — as classes utilitarias `translate-y-*` sobrescreveriam o
  `translateX` da centralizacao
- `CACHE_NAME`: `treino-cache-v30` -> `treino-cache-v31`

## [2.10.0] - 2026-08-24
### Alterado
- **Badge da ultima sessao agora aparece sempre** (`getPersistentLoadBadge()`). A condicao
  `if (isNaN(r) || r <= 10) return ''` limitava a referencia aos casos acima de 10
  repeticoes, entao na faixa de 6 a 10 — a mais usada em hipertrofia — o card nao exibia
  nada. A carga vinha pre-preenchida, mas as **repeticoes** da sessao anterior ficavam
  invisiveis, e e esse numero que indica progresso. O badge passa a mostrar
  series x reps x carga com a data formatada, variando apenas o tom e a sugestao: acima de
  10 sugere subir a carga, de 8 a 10 sugere somar uma repeticao, abaixo de 8 sugere
  consolidar antes de subir. Exercicios de cardio continuam com o badge proprio

### Adicionado
- **Troca avulsa por qualquer exercicio da biblioteca** (`openSwapPicker()`,
  `renderSwapPickerList()`, `applySwapPick()`). `swapExercise()` so ciclava entre reservas
  cadastradas; sem nenhuma, a mensagem mandava editar o plano — no meio do treino, com o
  aparelho ocupado. Agora o card tem uma lupa que abre a biblioteca com busca, e o botao de
  ciclo tambem cai nela quando nao ha reservas. As reservas do proprio slot aparecem no topo
  da lista, destacadas
- A troca **nao altera o plano**: vive no rascunho do dia (`state.customName`), e
  `initializeWorkoutData()` preserva esse nome ao restaurar, em vez de sobrescrever com o do
  plano. `getHistoryKey()` ganhou um terceiro parametro e passa a devolver `custom__<nome>`
  nesses casos, dando trilha propria ao exercicio avulso em vez de misturar o registro com o
  historico do slot. Como a leitura casa por nome desde a 2.8.0, a evolucao dele continua
  reunida com a dos outros planos
- **Duracao do treino** (`markWorkoutStart()`, `markWorkoutEnd()`, `formatDuration()`,
  `treino_workout_meta`). O inicio e marcado na primeira acao real — ajustar um valor ou
  concluir uma serie — e nao na abertura do app, para que consultar o treino de amanha nao
  inicie cronometragem. Sessoes acima de 8h sao descartadas como app esquecido aberto.
  Exibida no resumo do treino, na lista de treinos realizados e no detalhe do dia

### Removido
- `countSeriesDone()` e `getPersonalRecord()`: declaradas nas versoes 2.7.0 e 2.8.0 e nunca
  chamadas — a primeira porque a contagem acabou feita inline, a segunda por ter sido
  substituida por `getPersonalRecordFromList()`

## [2.9.3] - 2026-08-24
### Corrigido
- **`registration.update()` gerava uma promise rejeitada sem tratamento quando offline.** O
  `.catch()` existente cobria apenas `navigator.serviceWorker.register()`; a promise devolvida
  por `update()` dentro do `.then()` nao era retornada nem tratada, entao sem rede o console
  registrava `Uncaught (in promise) TypeError: Failed to update a ServiceWorker`. O app
  continuava funcionando normalmente — mas uma rejeicao nao tratada pode acionar handlers
  globais de erro e, num app instalado, ruido de console e a unica pista quando algo de fato
  quebra. Agora `update()` tem `.catch()` proprio

### Notas — verificacao de funcionamento offline
- Auditoria estatica: **nenhum recurso externo**. Zero `src`/`href` apontando para http(s),
  zero `fetch`/`XMLHttpRequest`, nenhum `@import` ou `url()` remoto no CSS. Tailwind, fontes,
  icones e graficos sao todos locais ou gerados em tempo de execucao (SVG por
  `renderSparkline()`, som por WebAudio)
- Teste com o servidor **desligado**: o app carrega, mantem perfil, check-ins, XP e sessoes,
  e permanecem funcionais o registro de carga, o rascunho, a marcacao de series, o cronometro
  de descanso, o audio, a finalizacao de treino, os graficos de evolucao e de peso, o
  historico por data, o resumo do dia, as confirmacoes e a geracao do arquivo de backup
  (`Blob`/`URL.createObjectURL` sao APIs locais)
- Estrategia do service worker permanece adequada: network-first para o documento (busca
  versao nova quando ha rede, cai para o cache quando nao ha) e cache-first para manifest e
  icones
- **`cache.addAll()` podia gravar uma versao antiga do app no cache offline.** Descoberto
  durante a verificacao: apos publicar uma versao nova, o cache do service worker continha o
  `index.html` anterior. A causa e que `addAll()` faz requisicoes comuns, sujeitas ao cache
  HTTP do proprio navegador — entao o cache offline nascia com o que o navegador ja tinha
  guardado, nao com o que o servidor estava entregando. Com rede o problema ficava invisivel
  (a estrategia e network-first), mas **sem rede o usuario receberia a versao antiga**, que e
  justamente quando o cache importa. Os assets passam a ser buscados com
  `new Request(url, { cache: 'reload' })`, que ignora o cache HTTP ao popular
- `CACHE_NAME`: `treino-cache-v27` -> `treino-cache-v29`

## [2.9.2] - 2026-08-22
### Adicionado
- **Dias opcionais no plano** (`toggleEditorDayOptional()`, `renderEditorDayOptional()`,
  campo `optional` por dia do schedule). A 2.8.0 fez `isRestDay()` reconhecer descanso, mas
  pelo unico criterio disponivel na epoca: dia **sem exercicios**. O plano padrao traz
  "Domingo: Extra (Opcional)" **com** exercicios cadastrados, entao quem nao treina domingo
  continuava tendo a sequencia zerada — relatado em uso real. Agora um dia nao quebra a
  sequencia quando esta vazio **ou** quando foi marcado como opcional, o que separa "nao ha
  nada para fazer" de "ha, mas e dispensavel"
- O editor mostra a consequencia da escolha em texto direto ("Se voce nao treinar neste dia,
  sua sequencia sera zerada" x "Nao fazer este treino nao vai quebrar sua sequencia"), e a
  barra de dias marca o dia com "(Opcional)"
- `migrateOptionalDays()`: marca uma unica vez os dias cujo proprio nome ou foco ja se
  declara opcional, o que conserta planos existentes sem exigir acao do usuario. A sequencia
  e derivada dos check-ins a cada render, entao o contador se recupera sozinho
- `duplicateProfile()` passou a copiar `optional` junto com o resto do dia

### Corrigido
- **Exercicios sem nome no detalhe do dia** (relatado em uso real: "mostra apenas o volume de
  carga e series/peso"). Entradas do log gravadas sem `name` — exercicio adicionado ao plano
  sem preencher o nome, ja que `addExerciseRow()` cria com `name: ''` — renderizavam um
  paragrafo vazio ao lado dos numeros. Reproduzido em teste antes da correcao.
  `resolveExerciseName()` recupera o nome consultando os planos pelo ID contido na chave do
  log (inclusive o sufixo `__vN` das reservas, e varrendo **todos** os perfis, ja que o
  registro pode ser de outro plano). Sem correspondencia, exibe "Exercicio sem nome" em
  italico esmaecido, em vez de uma linha muda
- `finalizeWorkout()` passou a garantir um nome no momento da gravacao, para o problema nao
  se repetir em registros novos

### Alterado
- `CACHE_NAME`: `treino-cache-v26` -> `treino-cache-v27`

## [2.9.1] - 2026-08-22
### Corrigido
- **Historico exibia o dia da semana errado** (relatado em uso real: treino de sabado
  aparecendo como domingo). `resolveWorkoutName()` devolve o nome da rotina registrada em
  `checkins[data]`, e `finalizeWorkout()` grava ali o `activeWorkoutKey` — que e o dia
  **selecionado no seletor**, nao necessariamente o dia de hoje. Abrir a rotina de domingo
  num sabado e finalizar gravava `DOM`, e a lista passava a exibir "Domingo: Extra
  (Opcional)" numa entrada datada de sabado, sem nenhuma pista da data real.
  Reproduzido em teste antes da correcao.
  Agora `weekdayOf()` e `formatDateWithWeekday()` derivam o dia da semana **sempre da
  data** (instanciada com `T12:00:00`, para o fuso nao empurrar para o dia anterior), e a
  lista e o modal passam a mostrar "sabado, 22/08/2026". Quando a rotina registrada nao
  corresponde ao dia da data, o modal exibe um aviso explicando qual rotina foi treinada,
  em vez de deixar a tela parecer errada. O resumo copiado leva a data completa
- **Dias do calendario nao abriam o resumo** (relatado junto: "somente a terca mostra").
  `openWorkoutDay()` so reconstruia `workoutHistoryCache` quando ele estava **vazio**, entao
  bastava ter visitado Perfil > Progresso uma vez para o cache congelar: qualquer treino
  finalizado depois nao constava, e tocar nesse dia no calendario nao produzia efeito algum,
  sem erro nem aviso. Passa a reconstruir a cada abertura — a agregacao custa poucos
  milissegundos mesmo com anos de historico (medido: 2,9 ms para 3.120 sessoes) — e, quando
  realmente nao ha registro para a data, exibe um toast em vez de falhar em silencio

### Alterado
- `CACHE_NAME`: `treino-cache-v25` -> `treino-cache-v26`

## [2.9.0] - 2026-08-22
### Corrigido
- **Cronometro de descanso aparecia atras dos cards de exercicio** (relatado em uso real). A
  causa nao estava no widget: o CSS do Tailwind deste projeto foi gerado a partir do HTML de
  uma versao anterior, entao `z-\[60\]` — classe introduzida junto com o cronometro — **nunca
  existiu na folha de estilo**. Sem z-index efetivo, os cards venciam o empilhamento por
  criarem contexto proprio atraves do `transform` da animacao de entrada (`card-enter`).
- Auditoria completa das classes usadas contra o CSS compilado revelou **36 classes sem
  definicao**, todas silenciosamente inertes. Entre as consequencias visiveis: `z-\[110\]`
  (a confirmacao generica podia ficar sob outros overlays), `left-0.5` e `left-\[1.375rem\]`
  (o "polegar" dos botoes de liga/desliga em Perfil > Dados nao deslizava), `bg-rose-600`
  (botao de confirmacao destrutiva sem cor de fundo), `tabular-nums` (digitos do cronometro
  mudando de largura a cada segundo), alem de `h-10`, `w-16`, `min-w-\[40px\]`, `italic`,
  `text-left`, `ml-auto`, sombras e variantes `active:`. Todas definidas a mao ao final do
  bloco `<style>`, sem depender de recompilar o Tailwind
- `value="${ex.name}"` no campo de nome do editor de planos ainda era interpolado sem escape;
  so a versao dos exercicios reserva havia sido corrigida na 2.5.0

### Adicionado
- **Tempo de descanso por exercicio** (`updateExerciseRest()`, `getRestSecondsFor()`): campo
  opcional no editor. Vazio mantem o padrao global, entao nada muda para quem nao mexer.
  Aplicado nos tres caminhos que iniciam o cronometro — botao do card, conclusao de serie e
  auto-descanso de cardio
- **Busca na biblioteca via `<datalist>`** (`buildExerciseDatalist()`): o editor montava tres
  `<select>` de 77 opcoes por linha (231 por exercicio, ate 2.310 num dia cheio), recriados a
  cada alteracao. Agora existe **um unico datalist** de 77 opcoes no documento e os campos de
  nome ganham busca por digitacao. A deteccao automatica de cardio, que era feita pelos
  seletores, migrou para `updateExerciseField()` — que so redesenha quando o tipo realmente
  muda, para nao roubar o foco durante a digitacao. `applyLibraryPick()` e
  `applyBackupLibraryPick()` ficaram sem uso e foram removidas
- **Reordenar exercicios** (`moveExerciseRow()`): setas para cima/baixo em cada linha do
  editor, desabilitadas nos extremos
- **Duplicar plano** (`duplicateProfile()`): copia dias, exercicios e reservas. Os IDs de
  exercicio sao **regerados** — o historico e indexado por esse ID, e uma copia que os
  mantivesse faria os dois planos gravarem no mesmo lugar, misturando cargas. Como o
  historico tambem casa por nome desde a 2.8.0, a evolucao continua visivel na copia
- **Resumo do treino a partir do calendario**: dias passados com exercicios registrados
  deixam de ser marcadores inertes e passam a abrir o resumo daquele dia, sinalizados com
  "ver". Marcar e desmarcar continua exclusivo do dia de hoje, entao nenhum gesto existente
  mudou de significado. `openWorkoutDay()` passou a montar o cache sob demanda, ja que agora
  pode ser chamada sem a aba Progresso ter sido aberta antes

### Alterado
- **Redesenho pontual dos cards** (`buildExerciseCard()`, `renderExerciseCard()`): marcar
  concluido, recolher, trocar por reserva, marcar serie e alterar o numero de series
  reescreviam os ~16 KB de HTML de todos os exercicios. Agora so o card afetado e
  substituido, preservando foco e rolagem. A animacao de entrada e suprimida no redesenho
  pontual, para o card nao reanimar sozinho ao ser tocado
- A tela de Novidades passa a listar apenas as `RELEASE_NOTES_NA_TELA` (5) versoes mais
  recentes. O historico completo permanece neste arquivo; sem o corte, a lista embutida
  crescia indefinidamente dentro do HTML que o app baixa
- `CACHE_NAME`: `treino-cache-v24` -> `treino-cache-v25`

## [2.8.0] - 2026-08-22
### Corrigido
- **Dias de descanso quebravam a sequencia** (`calculateStreak()`): a funcao percorria dias
  corridos de calendario e encerrava a contagem no primeiro dia sem check-in. Quem treinava
  de segunda a sexta via o contador zerar todo sabado — testado: 4 semanas sem falhar um
  unico treino planejado resultavam numa sequencia de **5**. Como consequencia, as conquistas
  `streak_7`, `streak_14`, `streak_30` e `streak_100` eram matematicamente inalcancaveis para
  qualquer pessoa com descanso no plano, e `checkStreakBonus()` quase nunca disparava.
  Agora `isRestDay()` identifica dias sem exercicios no plano ativo e a varredura os pula sem
  contar e sem quebrar. A sequencia passa a significar "treinos seguidos sem falhar"
- O laco ganhou teto de `STREAK_MAX_LOOKBACK_DAYS` (730). Sem ele, um plano composto apenas
  de dias de descanso faria a varredura correr indefinidamente, ja que nenhum dia quebraria
- Textos ajustados para refletir o novo significado: rotulo do cabecalho, toast de bonus e as
  quatro descricoes de conquista passaram de "dias seguidos" para "treinos seguidos"

### Adicionado
- **Aviso de divergencia entre `daysPerWeek` e o plano montado** (`countScheduledTrainingDays()`,
  `renderDaysPerWeekWarning()`, `applyDaysPerWeekFromSchedule()`): o campo e digitado a mao mas
  calibra quatro calculos — XP por check-in (`getFullCheckinXP`), meta semanal
  (`renderWeeklyProgress`), limiar da Refeicao Livre (`checkFreeMealReward`) e o multiplo do
  bonus de sequencia (`checkStreakBonus`). Divergir deixava tudo descalibrado em silencio.
  O editor agora compara o valor informado com a contagem real de dias que tem exercicios,
  explica a consequencia especifica de cada direcao (meta inatingivel x XP menor) e oferece
  ajuste num toque. Reavaliado ao abrir o editor, ao digitar no campo e ao adicionar ou
  remover exercicios. **Nada e alterado automaticamente** — mudar `daysPerWeek` sozinho
  reescreveria a economia de XP de quem ja usa o app
- **Historico que acompanha o exercicio entre perfis** (`normalizeExerciseName()`,
  `collectSessionsForExercise()`, `getLastSessionForExercise()`): o log e indexado por ID de
  exercicio e cada perfil gera IDs proprios, entao o mesmo "Supino Reto" em dois planos tinha
  dois historicos isolados — o segundo comecava sem carga sugerida, sem grafico e sem recorde.
  A **gravacao continua indo para a chave propria** de cada exercicio; o que mudou foi a
  leitura, que reune sessoes de mesmo nome (comparacao sem acentos, sem diferenca de caixa e
  com espacos normalizados). Quando ha sessoes do mesmo dia em planos diferentes, prevalece a
  de maior carga. Usado na sugestao de carga inicial, nos badges de ultima sessao (marcados
  com "de outro plano") e no modal de evolucao, que exibe um aviso quando esta reunindo
  mais de um plano
- `getPersonalRecordFromList()` extraida de `getPersonalRecord()`, para o recorde poder ser
  calculado sobre a lista agregada e nao apenas sobre uma chave do log

### Alterado
- `getPersistentLoadBadge()` e `getCardioHistoryBadge()` passaram a receber o nome do
  exercicio como segundo parametro e a escapar os valores que interpolam
- `CACHE_NAME`: `treino-cache-v23` -> `treino-cache-v24`

## [2.7.0] - 2026-08-22
### Adicionado
- **Marcação de séries concluídas** (`getSeriesDone()`, `countSeriesDone()`, `toggleSerie()`,
  `renderSeriesRow()`): cada exercício de força ganha uma fileira de botões, um por série,
  derivada de `state.sets`. Marcar uma série dispara `startRestTimer()` — o descanso real
  acontece **entre** séries, não depois do exercício inteiro, que era quando o cronômetro
  disparava até agora
- Primeira etapa do registro por série. Deliberadamente **não** altera o formato de dados:
  `seriesDone` vive apenas em `formData`, ou seja, no rascunho do dia. `sessionLog` e
  `exerciseHistory` seguem intactos, então nada do histórico existente é afetado e a mudança
  é reversível. Registrar carga/reps por série é a etapa 2, a ser decidida depois de uso real
- Os botões de série têm 40px de altura, dimensionados para acerto de primeira durante o
  treino, e carregam `aria-pressed`/`aria-label`

### Alterado
- `toggleDone()` passou a aceitar um segundo parâmetro `seriesJaAjustadas`. Sem ele, a função
  sincroniza a fileira com o estado do exercício (concluir marca todas, reabrir limpa todas),
  que é o comportamento do botão redondo. Com ele — usado por `toggleSerie()` — a fileira é
  preservada, porque já reflete o toque do usuário
- O descanso automático em `toggleDone()` ficou restrito a exercícios de **cardio**. Os de
  força já disparam o cronômetro série a série; sem essa restrição, concluir a última série
  iniciaria dois cronômetros em sequência
- `adjustValue()` re-renderiza o card ao alterar o número de séries, para a fileira crescer ou
  encolher junto. `getSeriesDone()` normaliza o array contra `state.sets` a cada leitura, então
  mudar de 4 para 3 séries no meio do treino não deixa estado órfão
- `CACHE_NAME`: `treino-cache-v22` -> `treino-cache-v23`

### Corrigido
- Durante o desenvolvimento desta versão: na primeira implementação, desmarcar uma série do
  meio de um exercício já concluído apagava todas as outras. A causa era `toggleSerie()`
  chamar `toggleDone()`, que preenchia `seriesDone` inteiro com o novo valor de `state.done`.
  Resolvido com o parâmetro `seriesJaAjustadas`

## [2.6.0] - 2026-08-22
### Adicionado
- **Histórico de treinos por data** (`buildWorkoutHistory()`, `renderWorkoutHistory()`,
  `openWorkoutDay()`): nova seção em Perfil > Progresso. O `sessionLog` é indexado por
  exercício, então responder "o que fiz no dia X" exige inverter o índice — a agregação
  percorre todo o log e agrupa por data, somando o volume de cada dia. Roda sob demanda,
  apenas ao abrir a aba Perfil, e não a cada render
- `resolveWorkoutName()` resolve o nome do treino a partir de `checkins[data]` contra o
  perfil ativo, com dois fallbacks: nome do dia da semana pelo `DAY_FULL_NAMES` e, por
  último, o dia da semana derivado da própria data (instanciada com `T12:00:00` para o fuso
  não empurrar para o dia anterior). Necessário porque o plano pode ter sido alterado ou o
  dia registrado sob outro perfil
- **Modal de detalhe do dia**: exercícios separados em Força e Cardio, volume por exercício,
  observações registradas e um botão que remonta o mesmo formato de resumo do
  `finalizeWorkout()` para copiar
- Paginação simples da lista (`workoutHistoryLimit`, 10 iniciais + 15 por toque em "Ver mais")

### Alterado
- **`askConfirm()`**: confirmação genérica baseada em Promise, para substituir o `confirm()`
  nativo — que em PWA standalone exibe o domínio no diálogo (visível sobretudo no iOS) e
  destoa do resto da interface. Aceita título, texto em HTML, ícone, rótulos e variante
  `danger`; fecha por toque no fundo e por Escape, sempre removendo os listeners que
  registrou. `deleteProfile()` passou a ser `async` para usá-la
- `deleteProfile()` agora informa quantos dias de treino serão perdidos e deixa explícito que
  o histórico de sessões e os check-ins **não** são apagados junto
- `CACHE_NAME`: `treino-cache-v21` -> `treino-cache-v22`

### Corrigido
- **`removeExerciseRow()` apagava um exercício do plano sem qualquer confirmação**: um toque
  no ✕ removia o exercício e as duas reservas de imediato, sem desfazer. Agora passa por
  `askConfirm()`, informando quantas reservas serão removidas junto

## [2.5.0] - 2026-08-22
### Adicionado
- **Backup completo dos dados** (`BACKUP_KEYS`, `buildBackupObject()`, `exportBackup()`,
  `handleImportFile()`, `confirmImport()`): exporta todas as chaves do `localStorage` num
  único JSON com envelope de metadados (`app`, `backupVersion`, `appVersion`, `exportedAt`).
  A exportação tenta primeiro `navigator.share({ files })` — único caminho que funciona no
  iOS, onde `<a download>` apenas abre o JSON como texto — e cai para o download via Blob
  quando a folha de compartilhamento não está disponível. `copyBackupToClipboard()` é a
  terceira alternativa para WebViews restritas. A importação valida o campo `app`, mostra
  um resumo do conteúdo (check-ins, sessões, nível) antes de confirmar, e **substitui**
  todas as chaves — as ausentes no arquivo são removidas para o estado final ser
  exatamente o do backup
- **Status e lembrete de backup** (`treino_last_backup_at`, `renderBackupStatus()`,
  `maybeSuggestBackup()`): a aba Perfil > Dados mostra há quantos dias foi o último backup,
  com destaque âmbar acima de 14 dias. O lembrete no boot só dispara com 5+ check-ins e no
  máximo uma vez a cada 7 dias (`treino_last_backup_nag`)
- **Rascunho do treino em andamento** (`DRAFT_KEY`, `saveDraft()`, `saveDraftNow()`,
  `loadDraftFor()`, `clearDraft()`): `formData` passa a ser persistido a cada alteração
  (debounce de 400ms em `adjustValue`/`updateWeightDirectly`/`updateObs`; gravação imediata
  em `swapExercise` e `toggleDone`). O rascunho é validado por data + perfil + treino, e
  limpo em `finalizeWorkout()` e na virada do dia
- **Histórico completo de sessões** (`SESSIONS_KEY`, `recordSession()`, `sessionVolume()`,
  `getPersonalRecord()`, `checkPersonalRecord()`): cada `finalizeWorkout()` grava uma entrada
  por exercício por dia (regravar o mesmo dia atualiza em vez de duplicar), limitado a
  `MAX_SESSIONS_PER_EXERCISE = 200` por chave. `migrateHistoryToSessionLog()` semeia o log
  a partir do `exerciseHistory` antigo no primeiro boot da versão, e é idempotente
- **Recordes pessoais**: `checkPersonalRecord()` compara a sessão nova com o melhor
  resultado anterior (carga, desempate por reps) e dispara um toast. A primeira sessão de
  um exercício nunca conta como recorde
- **Modal de evolução por exercício** (`openExerciseProgress()`): gráfico da carga ao longo
  do tempo, variação desde a primeira sessão, recorde pessoal, contagem de sessões, melhor
  marca e histórico com volume por sessão
- **Gráfico de linha em SVG puro** (`renderSparkline()`): sem biblioteca externa, para o app
  seguir sendo um único arquivo offline. Usado na evolução dos exercícios e no histórico de
  peso corporal. Trata série constante (divisão por zero) e exige ao menos 2 pontos
- **Cronômetro de descanso entre séries** (`restTimer`, `startRestTimer()`,
  `adjustRestTimer()`, `finishRestTimer()`): widget flutuante com anel de progresso. O tempo
  restante é derivado de `Date.now()` contra `endsAt`, **nunca de contagem de ticks** — iOS e
  Android congelam timers em segundo plano e uma contagem por ticks atrasaria exatamente
  quando o cronômetro importa. `visibilitychange` recalcula ao voltar do background. Início
  automático opcional ao concluir um exercício, suprimido quando o treino já está completo
- **Áudio do cronômetro via WebAudio** (`unlockAudio()`, `playBeep()`): oscilador gerado em
  tempo real, sem arquivo de som. O `AudioContext` é destravado no primeiro `touchend`/`click`
  porque o iOS só permite áudio iniciado dentro de um gesto real do usuário
- **Configurações de descanso** na aba Perfil > Dados: tempo padrão, início automático, som
  e vibração (`SETTINGS_KEY`). A linha de vibração é ocultada quando `navigator.vibrate` não
  existe — caso do iOS — em vez de exibir um botão inerte
- **Volume total** (séries x reps x carga) somado no resumo do treino

### Corrigido
- **Exercício reserva não sobrevivia ao recarregar o app**: `variantIndex` era definido em
  `swapExercise()` mas nunca persistido, e `initializeWorkoutData()` lia sempre
  `exerciseHistory[ex.id]` (variante 0). Agora a variante vai no rascunho e é restaurada; se
  a reserva escolhida foi apagada do plano, o card cai de volta no exercício base
- **Nomes com aspas quebravam a interface** (`escapeHtml()`, `escapeJs()`): um nome como
  `Supino "pegada fechada"` fechava o atributo `value=` no editor de planos. Aplicado nos
  nomes de exercício, observações, dica `alt` e nome do arquivo importado. `escapeJs()` cobre
  os nomes que entram dentro de `onclick="fn('...')"`, escapando aspas simples e barras
- **`saveJSON()` engolia `QuotaExceededError` em silêncio**: passa a retornar boolean e
  avisar por toast uma vez por sessão. Sem isso o app continuava aparentando salvar
- **Cópia do resumo falhava no iOS**: `document.execCommand('copy')` não funciona com campo
  `readonly` no Safari. `copyTextToClipboard()` usa `navigator.clipboard` quando disponível e
  cai para o método antigo com seleção via `Range`, que é o que o iOS exige
- **Rascunho sobrescrevia o nome do exercício**: renomear um exercício no plano com um
  rascunho aberto deixava o card preso no nome antigo. O rascunho passa a guardar apenas os
  valores; o nome vem sempre da definição atual do plano

### Alterado
- **Suporte a iOS/iPadOS**: metatags `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style` e `apple-mobile-web-app-title` (o Safari ignora o
  `manifest.json` para instalação na tela de início); `viewport-fit=cover` mais
  `env(safe-area-inset-*)` no header, na navegação inferior e no cronômetro para respeitar o
  entalhe e a barra de gestos; `overscroll-behavior-y: contain` para bloquear o
  puxar-para-atualizar dentro do PWA; `-webkit-tap-highlight-color: transparent`.
  Campos de formulário recebem `font-size: 16px` **apenas** dentro de
  `@supports (-webkit-touch-callout: none)`, que isola a regra a WebKit em iOS — abaixo de
  16px o Safari dá zoom automático ao focar o campo. Android e desktop ficam inalterados
- `PLATFORM` (`isIOS`, `isAndroid`, `isStandalone`) centraliza a detecção de plataforma,
  incluindo o iPadOS que se identifica como `MacIntel` com `maxTouchPoints > 1`
- `#appHeader` ganhou a classe `header-compact`, sincronizada por `updateHeaderOnScroll()`,
  para o padding com safe-area acompanhar o estado retraído
- `CACHE_NAME` do service worker: `treino-cache-v20` -> `treino-cache-v21`

### Notas
- **Lembrete de treino por notificação foi avaliado e não implementado.** Não existe API
  confiável de notificação agendada em PWA: `Notification Triggers` segue atrás de flag no
  Chrome, e no iOS notificações exigem o app instalado na tela de início (16.4+) e não podem
  ser agendadas para disparar com o app fechado. Entregar isso hoje resultaria num lembrete
  que só funciona com o app aberto. É candidato natural para quando o projeto virar app
  nativo
## [2.4.0] - 2026-08-21
### Adicionado
- **Cabeçalho retrátil ao rolar** (`updateHeaderOnScroll()`, listener em `window` no evento
  `scroll`, passive): acima de `scrollY > 40`, aplica classes compactas (`py-2`, ícone e
  título menores, subtítulo com `opacity-0 max-h-0`, barra de nível com menos margem) via
  `transition-all duration-300` nos elementos; abaixo do limiar, reverte. Chamado também
  logo após a restauração de scroll em `switchView()` para refletir o estado correto
  imediatamente ao trocar de aba
- **Filtro na aba Conquistas** (Todas / Desbloqueadas / Bloqueadas): `achievementsFilter`
  + `setAchievementsFilter()`, aplicado dentro de `renderAchievementsView()` antes do
  mapeamento para HTML; estado vazio (`#achievementsEmptyState`) exibido quando o filtro
  não retorna nenhum item
- **Dicas de descoberta** (`treino_hints_seen` no localStorage, `{ swipe, swap }`):
  - Banner dispensável (`#swipeHintBanner`) explicando a navegação por swipe, mostrado uma
    única vez (ao concluir o onboarding ou, para quem já tinha perfil, no carregamento),
    auto-oculto após 6s ou ao ser tocado ou ao usuário realizar um swipe real
  - Pulso visual (`pulse-glow`, reaproveitando a animação já existente) no botão de trocar
    exercício reserva, aplicado apenas quando `hasBackups && !hintsSeen.swap`; removido
    permanentemente assim que `swapExercise()` é usado com sucesso pela primeira vez
### Corrigido
- Durante o desenvolvimento desta versão, identificado e corrigido um bug onde a dica de
  swipe nunca aparecia para usuários novos: `maybeShowSwipeHint()` só era chamada no
  `DOMContentLoaded` inicial, momento em que `isProfileComplete()` ainda era `false` para
  quem está passando pelo onboarding pela primeira vez. Adicionada chamada equivalente ao
  final de `submitOnboarding()`

## [2.3.4] - 2026-08-20
### Adicionado
- **Modal de confirmação ao finalizar treino incompleto**: `finalizeWorkout()` foi extraída
  do handler de clique do `btnGenerate` para uma função própria; o handler agora checa
  `areAllExercisesDoneForActiveWorkout()` antes — se completo, finaliza direto; se
  incompleto, mostra `#confirmFinishOverlay` com contagem de exercícios feitos/total e o
  XP que seria perdido, só chamando `finalizeWorkout()` após confirmação explícita
  (`confirmFinishWorkout()`)/cancelamento (`cancelFinishWorkout()`)
### Alterado
- **Aba Perfil reorganizada em 3 sub-abas** (Dados / Saúde / Progresso), navegáveis por
  uma pílula interna no topo da view (`switchPerfilSubTab()`). Reduz a rolagem vertical
  que antes empilhava 7+ seções numa página só. A sub-aba selecionada é lembrada em
  memória (`perfilSubTab`) enquanto o app está aberto, inclusive ao sair e voltar pra
  aba Perfil. Nenhum ID de elemento interno mudou — apenas o agrupamento/contêineres —
  então todas as funções de render (`renderIMCCard`, `renderWaterCard`,
  `renderMetabolismCard`, `renderGoalRoadmap`, `renderWeightHistory`) continuam
  funcionando sem alteração

## [2.3.3] - 2026-08-20
### Corrigido
- **Sistema de toast reescrito com fila** (`toastQueue`/`toastActive`/`processToastQueue()`):
  antes, chamadas consecutivas de `showToast()` (comum quando check-in + bônus de
  sequência + conquista disparam quase juntos) reiniciavam o timeout do toast anterior,
  cortando a mensagem antes do usuário conseguir ler. Agora cada chamada entra numa fila
  e é exibida em sequência, com um intervalo de 250ms entre uma e outra
### Alterado
- **Área de toque dos botões de ação nos cards de exercício** (trocar reserva, marcar
  concluído, recolher/expandir) aumentada de 32-36px para 44px (`w-11 h-11`), alinhando
  com a recomendação de acessibilidade de alvo mínimo de toque (WCAG 2.5.5)

## [2.3.2] - 2026-08-20
### Corrigido (bug crítico de fuso horário)
- **Todas as chaves de data do app usavam `Date.toISOString().slice(0, 10)`**, que
  converte para UTC antes de extrair a data. Em fusos atrás de UTC (Brasil, UTC-3), a
  partir de ~21h-22h no horário local a data em UTC já tinha virado o dia seguinte,
  fazendo `todayKey()` e todas as funções dependentes dela retornarem a data de amanhã
  horas antes da meia-noite real — o sintoma relatado foi consumo de água resetando
  sozinho por volta das 22h
- Criado `formatLocalDateKey(date)`, que monta a string `YYYY-MM-DD` a partir de
  `getFullYear()`/`getMonth()`/`getDate()` (fuso horário local do aparelho, não UTC).
  Substituído em todos os pontos que usavam `toISOString()` para gerar chaves de data:
  `todayKey()`, `renderCheckinGrid()`, `calculateStreak()`, `calculateMonthlyCount()`,
  `getCurrentWeekKey()`, `calculateWeeklyCheckinCount()`
- Bug reproduzido e confirmado em teste automatizado simulando 22h no fuso
  `America/Sao_Paulo` (UTC-3): antes da correção, a chave de data já apontava para o dia
  seguinte às 22h; depois da correção, permanece correta até a meia-noite local

## [2.3.1] - 2026-08-19
### Adicionado
- Nova convenção de versionamento a partir de agora: patch (terceiro dígito, ex 2.3.1)
  para melhorias/correções pequenas; minor/major para funcionalidades grandes
### Corrigido
- **Histórico de exercícios reserva isolado do exercício base**: ao trocar para uma
  reserva via `swapExercise()`, séries/reps/carga (ou tempo/distância) agora são salvos
  numa chave de histórico própria (`${exId}__v${variantIndex}`) em vez de sobrescrever
  `exerciseHistory[exId]`. Cada variante (original, reserva 1, reserva 2) mantém sua
  própria progressão; ao trocar de volta para uma variante já usada antes, os valores
  salvos dela são recarregados automaticamente
### Adicionado
- **Auto-retração de cards ao concluir**: `toggleDone()` agora adiciona o exercício a
  `collapsedIds` ~550ms depois de marcado como concluído (dá tempo da animação do check
  rodar antes); desmarcar remove imediatamente do `collapsedIds`, reabrindo o card.
  `initializeWorkoutData()` também pré-popula `collapsedIds` com exercícios já concluídos
  no dia ao trocar de dia/perfil
- **Persistência de scroll por aba**: novo objeto `scrollPositions` guarda `window.scrollY`
  de cada aba ao sair dela (dentro de `switchView()`); ao entrar numa aba, restaura via
  `window.scrollTo()` dentro de dois `requestAnimationFrame()` aninhados (garante que o
  layout já foi recalculado antes de rolar)
### Alterado
- **Menu inferior**: opacidade do fundo reduzida (`bg-slate-900/80`) com blur mais forte
  (`backdrop-blur-xl`), borda sutil translúcida (`border-white/10`) e sombra customizada
  em camadas (`shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]`)
  para efeito de vidro fosco com mais contraste sobre o conteúdo rolando por trás

## [2.3.0] - 2026-08-19
### Adicionado
- **Tela de "Novidades"** (para testadores): modal acionável manualmente pelo rodapé
  ("🆕 Ver Novidades") ou exibido automaticamente na primeira abertura do app após uma
  atualização de versão. Mostra os destaques da versão atual em linguagem 100% focada em
  experiência do usuário — nenhum termo técnico, isso continua só neste CHANGELOG.md
- **Histórico de Versões** dentro da tela de Novidades: seção retrátil listando os
  destaques de todas as versões anteriores relevantes (a partir da 1.0.0), na mesma
  linguagem acessível
- Nova constante `RELEASE_NOTES` no código, com uma entrada por versão (`version`, `date`,
  `highlights[]`) — toda futura versão deve adicionar uma entrada aqui além da entrada
  técnica neste CHANGELOG.md
- Rastreamento de `treino_last_seen_version` no localStorage para saber quando mostrar a
  tela automaticamente (só dispara para quem já tinha uma versão anterior registrada —
  instalações novas não veem a tela na primeira abertura, só o onboarding)

## [2.2.0] - 2026-08-19
### Adicionado
- **Rotina de virada de dia**: o app agora verifica a cada minuto (e sempre que volta a
  ficar em primeiro plano) se a data mudou; quando muda, a água consumida, o check-in do
  dia e os exercícios concluídos são atualizados na tela automaticamente, sem precisar
  recarregar o app manualmente. Os dados já eram armazenados por data — essa rotina
  garante que a interface reflita isso em tempo real, inclusive à meia-noite
- **Horário de Treino** no editor de Perfil de Treino (aba Planos): novo campo para
  registrar em que horário você costuma treinar, exibido como referência no topo da tela
  de treino (substituindo o valor fixo "12h00 - 13h30" que existia antes)
### Alterado
- **Datas na aba Conquistas** agora exibidas no padrão brasileiro (DD/MM/AAAA) em vez do
  formato ISO (AAAA-MM-DD)
- **Layout da aba Perfil reorganizado**: a seção "Consumo de Água" (botões +100ml/-100ml)
  foi movida para logo abaixo dos cards de IMC e Água do dia, antes das seções
  explicativas
- **Menu de navegação movido para uma barra flutuante inferior** (padrão de apps mobile),
  com ícones e rótulos, mantendo a navegação por swipe funcionando normalmente. Todas as
  telas ganharam espaçamento inferior extra para o menu não sobrepor o conteúdo

## [2.1.0] - 2026-08-18
### Adicionado
- **3 fórmulas validadas de TMB** com seletor visual na aba Perfil:
  - **Mifflin-St Jeor** (padrão/recomendada) — considerada a mais precisa para a
    população em geral pela literatura atual
  - **Harris-Benedict** (revisão de 1984) — padrão histórico em nutrição clínica
  - **Katch-McArdle** — baseada em massa magra, a mais precisa para quem treina
    musculação e tem baixo percentual de gordura; exige o campo opcional de % de
    gordura corporal (novo campo no perfil), com aviso quando não preenchido
  - Cada fórmula tem uma explicação própria, escrita para ser compreensível a um
    usuário comum mas tecnicamente precisa, trocando automaticamente ao alternar
    a fórmula selecionada
  - A escolha de fórmula é salva no perfil e persiste entre sessões
### Alterado
- **Todos os blocos de texto explicativos mais longos do app agora usam alinhamento
  justificado** (`text-align: justify`): explicação do IMC, aviso sobre limitação do
  IMC, explicação da TMB/TDEE, nota sobre sexo não alterar o cálculo do IMC, texto de
  boas-vindas do onboarding, nota de privacidade do perfil, e dicas de exercícios
  alternativos

## [2.0.0] - 2026-08-18
### Corrigido (bug crítico)
- **Perda de progresso ao fechar o app**: exercícios marcados como "concluído" só eram
  salvos ao clicar em "Finalizar Treino" — se você fechasse o app antes disso, o estado
  de conclusão era perdido. Agora cada toque no check de conclusão é persistido
  imediatamente (`treino_daily_completion`), sobrevive a fechar/reabrir o app. Testado
  simulando um reinício completo do app
### Adicionado
- **Retrair/expandir cards de exercício**: toque no card ou no ícone de seta para
  esconder os campos e deixar a tela mais organizada durante o treino
- **Exercício reserva (substituição)**: botão de troca (🔄) em cada card, com animação,
  para substituir o exercício atual por uma reserva cadastrada — útil quando o
  equipamento está ocupado. Cadastro de até 2 reservas por exercício no editor de perfil
  (aba Planos), com busca rápida na base de exercícios. A substituição vale só para a
  sessão atual; o plano salvo não é alterado
- **Botões de ajuste de carga ±10kg**, além dos ±5kg e ±0,5kg já existentes
- **Navegação por swipe**: arraste o dedo horizontalmente para alternar entre as abas
  Treino → Planos → Perfil → Conquistas, na direção do gesto
- **Force update**: o app agora verifica atualização toda vez que é aberto (com
  internet) e recarrega sozinho quando uma versão nova está disponível; o service worker
  passou a usar estratégia "network-first" para o HTML principal, priorizando sempre
  buscar a versão mais recente antes de usar cache
- **8 novas conquistas com referências pop**: "É de mais de 8000!" (8.000 XP total),
  "Kurohitsugi" (nível 90), "Que a Força Esteja Com Você" (check-in em 4 de maio),
  "Eu Sou a Vingança, Eu Sou a Noite" (check-in entre 21h–7h), "Os Pesos de Rock Lee"
  (+10kg de uma vez no botão de ajuste), "A Vontade do Fogo" (30 check-ins totais),
  "One For All: 100%" (sequência de 100 dias)
### Alterado
- Conquistas de nível renomeadas com referências pop: nível 10 "Posso Fazer Isso O Dia
  Todo", nível 25 "Vá Além... Plus Ultra!", nível 50 "Bankai!", nível 100 "Uma Repetição
  Para Todos Governar"
- Conquista de segundo perfil renomeada para "Com Grandes Poderes, Vem Grandes
  Responsabilidades" e sua condição mudou de "criar" para "criar E equipar/ativar" um
  segundo perfil

## [1.9.0] - 2026-08-17
### Revertido
- **Voltamos ao modelo de arquivo único.** A divisão em `css/app.css` + `js/*.js` da
  v1.8.0 foi desfeita a pedido — o projeto agora é novamente um único `index.html`
  autocontido (~144KB). A divisão só volta a acontecer se pedida explicitamente no
  futuro. Durante a remesclagem, um bug foi encontrado e corrigido: o `re.sub` do
  Python usado no script de remesclagem estava interpretando `\n` dentro do JS como
  escape de regex e inserindo quebras de linha reais no meio de uma string — corrigido
  trocando para concatenação direta de texto; sintaxe e testes funcionais revalidados
### Adicionado
- **Onboarding obrigatório no primeiro acesso**: tela cheia, não-dispensável, pedindo
  nome, data de nascimento, altura, peso, sexo (opcional) e nível de atividade antes de
  liberar o app. Reaproveita a lógica de `saveProfile()` para não duplicar código
- **Data de nascimento** substitui o campo de idade — idade agora é sempre calculada
  automaticamente a partir da data cadastrada, exibida junto ao campo
- **Detecção de aniversário**: no dia do aniversário do usuário, mostra uma mensagem de
  parabéns e desbloqueia a conquista "Mais um Ano de Treino" (uma vez por ano)
- **Taxa Metabólica Basal (TMB) e Gasto Total Estimado (TDEE)**: novo card na aba Perfil,
  usando a fórmula de Mifflin-St Jeor (peso, altura, idade, sexo) multiplicada pelo nível
  de atividade cadastrado, com aviso de que é uma estimativa

## [1.8.0] - 2026-08-17
### Alterado
- **Código dividido em múltiplos arquivos** para facilitar manutenção. Estrutura nova:
  - `css/app.css` — todo o CSS (antes embutido no `<style>` do index.html)
  - `js/01-data.js` — versão do app e banco de dados semente do perfil padrão
  - `js/02-state.js` — persistência (localStorage), estado global, camada de dados dos
    perfis de treino, base de exercícios
  - `js/03-profiles.js` — listagem e editor de perfis de treino
  - `js/04-checkin-nav.js` — check-in semanal, navegação entre abas, notificações toast
  - `js/05-gamification.js` — XP, níveis e conquistas
  - `js/06-health.js` — IMC, água, roadmap de peso, perfil de saúde
  - `js/07-workout.js` — renderização dos exercícios do dia, ajuste de valores, geração
    do resumo do treino, inicialização do app
  - `index.html` caiu de ~132KB para ~27KB, referenciando os arquivos acima em ordem
- `sw.js` atualizado para colocar todos os novos arquivos em cache (funciona offline
  exatamente como antes)
- Nenhuma mudança de comportamento — a divisão foi 100% mecânica; toda a suíte de testes
  funcionais (perfis, check-in, XP, conquistas, água, IMC) foi reexecutada contra a versão
  dividida servida via HTTP local e passou sem erros, idêntica à versão anterior

## [1.7.0] - 2026-08-16
### Adicionado
- **Sistema de Conquistas estilo Steam** (nova aba 🏆): 16 conquistas cobrindo check-ins
  totais, sequências, níveis, hidratação, perfis criados, registros de peso e refeições
  livres. Bloqueadas mostram barra de progresso (ex: "23/50"), desbloqueadas mostram a
  data
- **Bônus de sequência**: +30% do XP de check-in cheio toda vez que o streak completa um
  ciclo inteiro dos dias/semana do perfil ativo
- **Prêmio de Refeição Livre**: ao completar 80% dos dias de treino planejados na semana
  atual, libera o direito a uma refeição livre no fim de semana — com barra de progresso
  semanal visível na tela de treino
- Suporte a peso fracionado: incrementos de ±0,5kg, além de ±5kg, e digitação livre de
  decimais nos campos de carga (treino e editor de perfil)
### Alterado
- Bônus de água mudou de valor fixo (+2 XP) para **10% do XP de check-in cheio**, escalando
  com o perfil ativo
- **Ícone do app trocado** pela imagem fornecida pelo usuário, com nome de arquivo
  versionado (v3) para forçar atualização em quem já instalou
### Corrigido
- Campo de nome do exercício no editor de perfil estourava a largura do card em telas
  estreitas (bug clássico de flexbox — faltava `min-width: 0` no input `flex-1`)

## [1.6.0] - 2026-08-16
### Adicionado
- **Exercícios de cárdio agora têm campos próprios**: tempo (min) e distância (km) no
  lugar de séries/reps/carga. Ao escolher um exercício do grupo "Cardio" na base (Esteira,
  Bicicleta Ergométrica, Elíptico, Escada, Remo), o tipo é detectado automaticamente; dá
  para trocar manualmente entre Força/Cardio em qualquer exercício, inclusive customizados
- Histórico e resumo do treino formatados de forma diferente para cárdio (ex: "Esteira:
  30min | 5km") em vez do formato de séries/carga
### Alterado
- **Ícone do app redesenhado**: trocado o ícone de halteres por um ícone de barras
  ascendentes com destaque dourado (tema de progresso/XP), mais legível em tamanhos
  pequenos
- Arquivos de ícone renomeados (`icon-192.png`/`icon-512.png` → `icon-192-v2.png`/
  `icon-512-v2.png`) — essa troca de nome é proposital: é o que força o Android/Chrome a
  buscar o ícone novo em quem já instalou o app, já que ícones de PWA instalados ficam
  fortemente cacheados pelo sistema e raramente atualizam sozinhos com o mesmo nome de
  arquivo

## [1.5.0] - 2026-08-16
### Adicionado
- Campo "Sexo" no perfil (opcional, "prefiro não informar" disponível) — nota explícita
  na UI de que a fórmula/classificação do IMC (OMS) é a mesma independente do sexo; o
  campo existe para completude do perfil e possíveis métricas futuras
- Campo "Peso Alvo (kg)" no perfil
- **Roadmap de progresso** na aba Perfil: mostra peso inicial (primeiro registro do
  histórico), peso atual e peso alvo, com barra de progresso e "faltam Xkg" — funciona
  tanto para objetivos de perda quanto de ganho de peso

## [1.4.0] - 2026-08-16
### Adicionado
- **Gestão de múltiplos Perfis de Treino** (aba "Planos"): criar, editar e excluir perfis
  completos, cada um com nome, descrição, dias de treino por semana e ciclo semanal
  próprio (Segunda a Domingo)
- **Base de exercícios pré-cadastrados** (~70 exercícios em 10 grupos musculares) para
  compor os dias de cada perfil por seleção rápida, além de campo livre para exercícios
  personalizados
- Limite de 10 exercícios por dia, com contador visual no editor
- Seleção de perfil ativo, sempre lembrado entre sessões (mantém o último selecionado)
- XP de check-in agora é calculado dinamicamente a partir dos dias/semana do perfil ativo
  (pool semanal de 600 XP dividido pelos dias definidos)
- Painel de IMC expandido: texto explicativo por faixa, tabela de referência (OMS) e
  cálculo da faixa de peso "ideal" para a altura cadastrada, com aviso sobre a limitação
  do IMC para quem treina musculação
### Alterado
- Removidos os placeholders com dados pessoais reais dos campos de perfil (idade, altura,
  peso), substituídos por exemplos genéricos — o app foi pensado para ser compartilhado
### Segurança / Anti-trapaça
- Check-in agora só pode ser marcado/desmarcado no dia de hoje — dias passados e futuros
  ficam bloqueados na grade semanal, prevenindo XP obtido de forma retroativa ou antecipada

## [1.3.0] - 2026-08-15
### Adicionado
- **Sistema de XP e Níveis (1 a 100)**: barra de nível fixa no cabeçalho, XP calculado por
  check-in de treino
- **Check-in automático**: marcar todos os exercícios do dia como concluídos gera check-in
  automático com XP cheio (100 XP)
- **Check-in manual parcial**: usar "Finalizar Treino" sem ter concluído todos os exercícios
  concede metade do XP (50 XP); desmarcar um check-in no calendário revoga o XP concedido
- **Aba "Perfil"**: dados pessoais (nome, idade, altura, peso, nível de atividade)
- Cálculo de IMC com classificação (OMS) e indicador visual
- Meta de água diária calculada a partir do peso e nível de atividade, com botões de
  +100ml/-100ml e bônus de +2 XP ao bater a meta do dia
- Histórico de peso e IMC por data, registrado automaticamente ao salvar o perfil
### Observação
- Gestão de múltiplos perfis de treino (dias/semana configuráveis, exercícios customizados,
  limite de 10 por dia) fica para a próxima versão — é uma reestruturação maior do banco de
  dados de treinos


### Adicionado
- Sistema de versionamento e este changelog
- Número da versão exibido no rodapé do app

## [1.1.1] - 2026-08-14
### Corrigido
- Cache do service worker (`chassi-cache-v1` → `treino-cache-v2`) para garantir que
  atualizações publicadas no GitHub Pages realmente cheguem ao app já instalado

## [1.1.0] - 2026-08-14
### Alterado
- Renomeado de "Projeto Chassi 80kg" para "Treino Personalizado - Hipertrofia e Emagrecimento"
- Removidos termos de jargão militar/mecânico ("chassi", "torque", "blindagem", "extração",
  "diário de bordo", "combate", "tático") por linguagem padrão de musculação
- Grade de check-in mudou de vertical/6 dias para horizontal 4+3, incluindo domingo
  como dia extra opcional
### Adicionado
- Carregamento automático do treino correspondente ao dia da semana atual
- Contador de dias treinados no mês corrente
- Checkbox de "concluído" em cada card de exercício
- Botão de -5kg (simétrico ao +5kg já existente)
- Animações de entrada nos cards, pulso no dia atual do check-in, pop ao marcar
  check-in/exercício concluído

## [1.0.0] - 2026-08-07
### Adicionado
- Primeira versão como PWA instalável (manifest.json + service worker)
- Persistência via localStorage (histórico de séries/reps/carga por exercício)
- Sistema de check-in semanal com contador de sequência (streak)
- Marcador persistente de "hora de subir carga" baseado na última sessão registrada
- Plano de treino PPL 2x/semana adaptado (ênfase em peitoral inferior, restrições de
  joelho/escoliose, alternativas de exercício por limitação de equipamento)
