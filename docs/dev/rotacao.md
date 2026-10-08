# Rotação de treinos A/B/C (R1)

Nota de projeto escrita antes do código (prática P9). Regras em `app/src/domain/rotation.ts`.

## Ideia

Ao lado da semana fixa, o plano pode virar uma **rotação**: A, B, C, A, B, C… O próximo treino é
o seguinte ao último feito, qualquer que seja o dia da semana. Faltar terça não empurra o plano: na
quarta o app oferece o mesmo treino que ofereceria na terça.

## Dados

O plano continua com os 7 espaços (`days`, um por dia da semana): na rotação eles viram os treinos
A–G. Assim a troca entre semana fixa e rotação não perde nada e as telas de edição são as mesmas.

```ts
interface Plan {
  // ...
  rotation?: {
    /** Ordem dos treinos (espaços com exercícios). Espaço vazio ou que sumiu é ignorado. */
    order: DayKey[];
    /** Meta de treinos por semana: XP do check-in, semana e sequência. */
    perWeek: number;
    /** "Recomeçar do A": treinos antes deste instante não contam para achar o próximo. */
    restartAt?: string;
  };
}
```

Sem `rotation`, o plano é semana fixa, como sempre.

## Próximo treino

1. Ordem efetiva: `order` filtrada para espaços com exercícios, mais os espaços com exercícios que
   não estão nela (no fim, na ordem da semana). Vazia = sem treino.
2. Último treino que conta: o mais recente do histórico com `planId` deste plano, `dayKey` na
   ordem efetiva e depois de `restartAt` (comparando `startedAt`, ou a data).
3. Próximo = o seguinte na ordem, dando a volta. Sem nenhum = o primeiro.
4. Volta atual: `feitos` = posição do próximo na ordem (0 = começando uma volta nova).

A letra de cada treino é a posição na ordem efetiva (A, B, C…).

## Onde muda

- **Início:** o cartão de hoje mostra o próximo treino da rotação ("Treino B · 1 de 3 da volta"),
  nunca "dia de descanso". Com o treino de hoje feito, mostra "feito" e qual é o próximo.
- **Aba Treino:** o próximo vem primeiro, marcado "Próximo"; os outros seguem na ordem.
- **Plano:** chave "Semana fixa / Rotação". Na rotação, os cartões aparecem na ordem com a letra no
  lugar do dia da semana, com subir/descer, a meta por semana e "Recomeçar do A". Voltar para a
  semana fixa pergunta antes e devolve os dias como estavam.
- **Semana no Início:** sem dias planejados destacados.
- **XP e meta da semana:** usam `perWeek` em vez dos dias com treino.
- **Sequência:** na rotação não há dia de descanso fixo. Um intervalo sem treino conta como descanso
  se tiver no máximo `ceil((7 − perWeek) / perWeek)` dias (3×/semana: até 2 dias; 4× ou mais: 1).
  Hoje sem treino não quebra (o dia não acabou), como na semana fixa.
- **Lembretes:** um por dia, no horário do treino, com o nome do próximo treino; refeitos a cada treino concluído.

## Fora desta entrega

- Mover um treino feito fora de ordem para outro lugar da volta.
