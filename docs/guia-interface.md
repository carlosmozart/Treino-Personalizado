# Guia de interface — Meu Treino

Este documento é a referência visual e editorial para qualquer tela, texto, ilustração ou fluxo
novo. Antes de criar conteúdo, use estas regras; se uma proposta as contrariar, adapte a proposta
em vez de criar uma nova linguagem visual.

## Personalidade

O app é um companheiro de treino pessoal: direto, acolhedor, energético e sem promessas médicas.
Ele ajuda a registrar e manter consistência; não julga o usuário nem usa culpa como motivação.
Escreva em português brasileiro, em frases curtas e claras. Prefira verbos de ação: “Salvar”,
“Continuar”, “Ver progresso”, “Trocar exercício”.

## Tema e cores

O visual é escuro, com superfícies azul-ardósia e contraste alto. O fundo principal é
`#020617` (slate-950) e os cartões usam `#0f172a`/`#020617`, geralmente com borda `#1e293b`.

| Papel | Cor | Uso |
| --- | --- | --- |
| Ação principal | azul `#2563eb` | salvar, começar, confirmar |
| Sucesso/progresso | esmeralda `#059669` | concluído, XP, dados positivos |
| Atenção | âmbar `#d97706` | avisos e confirmação de impacto |
| Destrutivo | rosa `#e11d48` | apagar, desfazer, risco de perda |
| Informação | azul-claro `#93c5fd` | detalhes, dicas, links contextuais |
| Texto primário | branco/slate-100 | títulos e valores importantes |
| Texto secundário | slate-400/500 | explicações e metadados |

Não use vermelho para estados comuns, nem verde como única forma de comunicar sucesso. Qualquer
estado relevante precisa de texto ou ícone além da cor.

## Componentes

- Cartões: cantos `rounded-xl` ou `rounded-2xl`, borda sutil, respiro interno de 12–16 px.
- Botão principal: fundo azul, texto branco, altura confortável, rótulo com verbo. Um único CTA
  principal por área.
- Botão secundário: fundo slate escuro com borda. Ações destrutivas usam rosa e devem pedir
  confirmação quando removem dados.
- Campos: fundo quase preto, borda slate, texto claro, rótulo acima. Inputs numéricos devem usar
  `inputmode` adequado.
- Modais: fundo escuro, título explícito, saída visível, ações “Cancelar” e confirmação. Diga o
  efeito irreversível antes da confirmação.
- Listas longas: mantenha altura limitada com rolagem interna quando isso evita empurrar a tela.

## Hierarquia e conteúdo

1. Mostre primeiro a ação de hoje ou o dado que exige decisão.
2. Depois, a informação que ajuda a executar a ação.
3. Por último, histórico, detalhes e explicações.

Números de treino devem trazer unidade (`kg`, `min`, `ml`, `km`, `XP`). Não mostre precisão falsa:
use estimativas com `~` e o texto “estimado”. Para saúde, evite diagnóstico e inclua orientação
para profissional quando houver risco ou limitação.

## Feedback e acessibilidade

- Ações que salvam, concluem ou falham mostram feedback breve em toast.
- Preserve `aria-label` em ícones e botões sem texto.
- Áreas de toque devem ter pelo menos 44 × 44 px.
- Não dependa de hover; o fluxo principal deve funcionar por toque.
- Truncamento de nomes precisa oferecer acesso ao conteúdo completo por tooltip, modal ou detalhe.

## Ícones e imagens

O ícone do app representa uma pessoa levantando halter, sobre círculo azul. Novos visuais devem
manter o estilo de ilustração simples, cores azul-marinho, azul, verde-lima e pele quente. Evite
fotografia, texto dentro de imagens e efeitos realistas que destoem do ícone.

Para Android, use fonte PNG quadrada de no mínimo 1024 × 1024 e mantenha área de respiro para o
recorte adaptativo. Para telas internas, prefira ícones simples já usados no app a ilustrações
decorativas.

## Checklist para novo conteúdo

- O texto usa português brasileiro simples e um verbo claro?
- A ação principal está evidente e há no máximo uma por bloco?
- O estado continua compreensível sem cor, hover ou internet?
- Há confirmação antes de perda de dados?
- Medidas, estimativas e limitações estão explicadas honestamente?
- O componente respeita os tokens e padrões deste guia?
