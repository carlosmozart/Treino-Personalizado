# Progressão automática de carga (M10–M12)

Nota de projeto escrita antes do código (prática P9). A regra mora em
`app/src/domain/progression.ts`, é uma função pura e nada é gravado: a sugestão é recalculada a
partir do histórico toda vez que um treino começa.

## Entrada

- O exercício do plano: séries, repetições-alvo (`reps`), faixa opcional (`repMin`–`repMax`),
  incremento opcional (`increment`, em kg) e carga do plano.
- As sessões anteriores do exercício, pelo nome normalizado. Só contam as séries de trabalho
  (aquecimento fica de fora, como no volume e nos recordes).

Sem faixa, a faixa é `reps`–`reps`: quem não mexe no plano continua com o que tinha, e a progressão
passa a valer com o número de repetições que já estava lá.

## Progressão dupla (padrão)

Olha a última sessão. A carga de referência é a da última série de trabalho (a mesma que o treino
já usava para pré-preencher), e contam as séries feitas com essa carga.

1. **Sem histórico:** carga do plano. Sem aviso.
2. **Exercício sem carga** (carga 0, peso do corpo): sem sugestão de carga.
3. **Registro antigo** (`aggregated`, reconstruído de "3x10 · 40kg"): repete a carga, avisa que a
   base é um registro antigo. Nunca sobe a partir dele.
4. **Séries a menos que o plano:** mantém a carga. "Mantém 40 kg: 2 de 3 séries na última vez."
   Série não feita nunca sobe carga.
5. **Todas as séries no topo da faixa** com a carga de referência: sobe um incremento e volta as
   repetições para o início da faixa. "+2,5 kg: 12 reps nas 3 séries."
6. **Senão:** mantém a carga e mira o topo. "Mantém 40 kg: busque 12 reps em todas (última:
   12 · 10 · 9)."
7. **Estagnação:** se as **3 últimas** sessões tiveram a mesma carga de referência, nenhuma subiu
   (caso 5 não aconteceu) e o total de repetições não cresceu em relação à primeira das três,
   sugere deload de ~10%, arredondado para baixo no incremento. "−10%: 3 treinos sem evoluir com
   40 kg." Na sessão seguinte ao deload a carga é outra, então a contagem recomeça.

## Repetições pré-preenchidas

- Subiu: início da faixa (`repMin`).
- Manteve ou deload: topo da faixa (`repMax`), que é a meta.
- Sem faixa: `reps`, como antes.

## Incremento

`increment` do exercício; sem ele, 2,5 kg. Opções no editor: 1, 1,25, 2,5 e 5 kg. A carga
sugerida nunca fica abaixo de 0 e é arredondada para o incremento (deload) ou para 0,1 kg.

## Progressão linear (M10)

Opção por plano (`plan.progression = 'linear'`, no painel Planos). A faixa some: as repetições do
plano (o topo da faixa, ou `reps`) valem para subir e continuam as mesmas depois da subida. Todas as
séries planejadas nessas repetições pedem o incremento no treino seguinte; faltou repetição, mantém.
Falha, registro antigo e estagnação seguem as mesmas regras da dupla. Ausente = dupla.

## Peso do corpo (M30)

Exercícios reconhecidos pelo nome como peso do corpo (flexão, barra fixa, mergulho, abdominal,
prancha…; máquinas e polias de mesmo nome ficam de fora) e feitos com carga 0 progridem nas
repetições: todas as séries no alvo pedem uma repetição a mais; chegar lá na falha mantém. O alvo
é o topo da faixa ou, se já faz mais, o menor número de repetições da última vez.

## Carga ao abrir o treino (M13)

Configuração `loadSource`: `auto` (esta progressão), `last` (carga da última sessão e repetições do
plano, sem aviso) ou `plan` (carga e topo da faixa como estão no plano). Ausente, vale a antiga
`autoProgression` (falsa = `last`). Um aviso único (`hintsSeen.progressao`) explica a sugestão no
primeiro treino em que ela aparece.
