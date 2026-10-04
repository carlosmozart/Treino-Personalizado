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

Pendente para validação real (P3, TODO): rodar a migração sobre um backup exportado pelos
usuários atuais, localmente, e comparar contagens com o que o app antigo mostra.
