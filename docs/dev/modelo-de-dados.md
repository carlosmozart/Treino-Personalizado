# Modelo de dados por treino e migração (P3)

Nota de projeto (TODO P3/P9). Descreve o formato do app novo (`app/`) e como os dados do app
atual são convertidos sem perda. O código fica em `app/src/domain/model.ts`,
`app/src/domain/legacy/` e `app/src/storage/`.

## Por que mudar

O app atual grava o histórico **por exercício**: `treino_session_log[chaveDoExercício] = [...]`,
um registro por exercício por dia, com teto de 200. Não existe "o treino de terça" como objeto:
ele é remontado agrupando registros pela data. Isso impede, ou torna frágil, registrar treino
passado, mudar a data de um treino, recordes que dependem da ordem, mapa de calor por duração,
bi-set, tipos de série e progressão (TODO M5, M8–M11, M15–M18).

## O documento único

Tudo do usuário cabe num documento `AppData` (alguns MB no pior caso), salvo no IndexedDB e
exportado igual no backup:

```
AppData {
  schemaVersion: 1
  profile        dados pessoais, peso atual/alvo, meta de peso, histórico de pesagens
  plans          { [planId]: Plan }       planos de treino (antes "perfis de treino")
  activePlanId
  workouts       Workout[]                um item por treino realizado, ordenado por data
  checkins       { [data]: { dayKey } }   dias com check-in (calendário, sequência)
  water          { [data]: ml }
  gamification   XP, check-ins com XP, bônus, conquistas
  settings       descanso, som, vibração, lembretes
  meta           último backup, última versão vista, dicas vistas
}
```

### Workout

```
Workout {
  id, date (AAAA-MM-DD), startedAt?, endedAt?, durationMin?
  planId?, dayKey?, dayName?          de onde veio (pode faltar em treino livre/migrado)
  source: 'app' | 'migrated'
  entries: [{
    key           identidade do exercício = nome normalizado (sem acento, minúsculo)
    name          nome como foi exibido
    mode          'reps' | 'time' | 'cardio'
    sets          [{ reps, weight, kind: 'work' | 'warmup' }]   só séries FEITAS
    cardio?       { minutes, km? }
    note?
    aggregated?   true quando veio do formato antigo "3x10 · 40kg" (ver abaixo)
  }]
}
```

Regras:
- Um treino guarda **só o que foi feito** (consequência do bug O1, corrigido na 2.21.1).
- A identidade do exercício é o **nome normalizado**, não o "slot" do plano. O app atual já
  cruzava históricos de planos diferentes pelo nome (`collectSessionsForExercise`); agora isso
  é a regra, e trocar de plano não reinicia a evolução.
- Estatísticas (volume, recordes, 1RM, calorias) são **derivadas** dos treinos, nunca
  gravadas — corrigir um treino corrige tudo (mesmo princípio do openGym).

### Plan

Mesmo conteúdo dos "perfis de treino" atuais, com nomes claros: `days[SEG..DOM] = { name,
focus, optional, exercises[] }`, e cada exercício com `name`, `mode`, metas (`sets`, `reps`,
`weight`, `minutes`, `km`), `restSeconds?`, `optional`, `alternatives[]` (antes `backups`).
`daysPerWeek` deixa de ser campo: é calculado como dias **obrigatórios com exercícios**
(resolve O3). Consequência: o XP por check-in pode mudar para quem tinha o número
desalinhado com o plano — é o valor que o próprio app já sugeria corrigir.

## Migração do app atual

Entrada: o mesmo mapa `chave → texto` do backup v1 (`treino_*` do localStorage), mais o
histórico que hoje vive no IndexedDB `treino-session-log` (`current` e `exerciseHistory`).
Ler do aparelho e ler de um arquivo de backup antigo passam pelo **mesmo** conversor.

1. **Validar** com as mesmas regras do validador de backup atual (portado). Chave inválida
   não derruba a migração inteira: é ignorada e registrada no relatório.
2. **Guardar cópia** do conteúdo bruto antes de converter (IndexedDB `legacy-snapshot`).
   Nada do app antigo é apagado.
3. **Treinos:** juntar todos os registros do `session_log` (e do `exercise_history`, se
   algum dia não estiver no log) agrupando por data → um `Workout` por dia. Para cada data:
   - `dayKey` vem do check-in daquele dia; o plano é o que contém o exercício pelo id;
   - duração vem de `treino_workout_meta[data].minutos`;
   - registros sem data utilizável são descartados (já eram invisíveis no app atual);
   - formato antigo (sem `series`: `sets/reps/weight`) vira N séries iguais com
     `aggregated: true` — a interface mostra "registro antigo" em vez de fingir precisão;
   - registros duplicados do mesmo exercício no mesmo dia: vale o do `session_log`.
4. **Demais dados:** perfil, pesagens, meta, água, configurações, gamificação, conquistas e
   check-ins são copiados com renomeação de campos; valores numéricos gravados como texto por
   formulários antigos viram números.
5. **Rascunho** de treino em andamento não é migrado (fica na cópia bruta). A troca de versão
   será feita fora do horário de treino.
6. **Relatório:** quantos treinos, exercícios, pesagens e check-ins foram convertidos e o que
   foi ignorado, para conferência antes de confirmar.

## Casos-limite cobertos por testes

- histórico misto: registros antigos (agregados) e novos (por série) do mesmo exercício;
- exercício trocado por alternativa (`id__v1`) e troca avulsa (`custom__nome`);
- mesmo exercício em dois planos → um histórico só, pelo nome;
- check-in sem treino gravado (dia marcado sem registro) e treino sem check-in;
- registro sem data, números como texto, chaves desconhecidas e propriedades perigosas
  (`__proto__`) → ignorados sem quebrar;
- backup v1 exportado pelo app atual → mesmo resultado que ler do aparelho.

Validação real (P3): o backup de um usuário (2.19.1) converteu 11 treinos e 49 exercícios sem
descartes. Falta rodar sobre os backups dos outros dois usuários, localmente, antes da troca.

## Estado e ações (P4)

- **Ações puras** (`domain/actions.ts`): `(dados, argumentos, agora) → { data, events }`. Cada
  uma trabalha numa cópia; quando nada muda, devolve o mesmo objeto (a store não grava à toa).
- **Recompensas** (`domain/rewards.ts`): XP de check-in (cheio com todos os obrigatórios
  concluídos, meio caso contrário, upgrade só pela diferença), nível, bônus de sequência por
  ciclo do plano, refeição livre a 80% da semana, meta de água e aniversário. Viram **eventos**;
  quem mostra é a interface. Conquistas entram com a tela de progresso (P5).
- **Treino em andamento** (`domain/session.ts`): `ActiveSession` com séries marcáveis. Carga
  inicial = última série da última sessão do exercício (pelo nome), ou a do plano. Trocar pela
  reserva refaz as séries com o histórico dela. Ao finalizar, só as séries marcadas viram
  `Workout` (O1); nada marcado → nada é gravado. Duração acima de 5 h é descartada.
- **Store** (`store/app-store.ts`, Zustand): `init` (carrega ou migra), `run(ação)`,
  `startWorkout`/`updateSession`/`finishWorkout`/`discardWorkout`, `takeEvents`, `flush`.
- **Gravação** (`storage/persister.ts`): adiada (~250 ms), em fila, a última versão vence; o
  treino em andamento fica numa chave própria (`session`) por ser gravado a cada toque. Ao ir
  para segundo plano (`visibilitychange`/`pagehide`) tudo é gravado na hora. Falha de gravação
  aparece em `saveError` para a interface avisar.

## Pronto para sincronizar

Preparação feita antes de a 3.0 sair, para qualquer nuvem escolhida (servidor próprio ou
Firebase; ver a projeção do projeto). O transporte muda; a junção é a mesma (`domain/sync.ts`).

- **Carimbos** (`AppData.sync.changed`): cada registro tem a hora da última alteração, por chave
  — `workout:<id>`, `plan:<id>`, `weighin:<data>`, `checkin:<data>`, `water:<data>`, `profile`,
  `settings`, `activePlan`. Toda ação do domínio carimba o que muda.
- **Exclusões** (`AppData.sync.deleted`): apagar deixa a chave e a hora. Sem isso, um registro
  apagado num aparelho voltaria ao juntar com outro que ainda o tem.
- **Junção** (`mergeAppData(local, remoto)`): por chave, vence a alteração ou exclusão mais
  recente; empate fica com o local. Perfil, ajustes e plano ativo são registros inteiros. O peso
  atual é recalculado pela pesagem mais recente. Juntar de novo não muda nada (testado).
- **XP derivado**: o total é sempre `computeTotalXP` = base + XP de cada check-in + bônus de água
  e de sequência, cada um com o próprio valor. Na junção, o check-in de um dia fica com o maior
  valor (cheio vence meio, sem contar em dobro), bônus e conquistas de qualquer aparelho ficam,
  e o XP de check-in de um dia sem check-in sai. A **base** guarda o XP do app antigo que não
  tem registro de origem (o app antigo não gravava o valor de cada bônus).
- **Dados anteriores** a isso (versões de desenvolvimento e backups delas) são completados ao
  abrir (`normalizeAppData`): tudo carimbado na hora, bônus `true` viram 0 e o resto vai para a base.

Limitação conhecida: dois aparelhos que criam o plano de exemplo ao mesmo tempo geram a mesma
chave `plan:default`, e a versão mais recente vence. Ids de plano únicos por aparelho resolvem;
fica para quando a sincronização for implementada.
