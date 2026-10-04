# Créditos

## Ilustrações de exercícios (app novo, `app/`)

As ilustrações dos exercícios vêm do **Everkinetic** (<https://github.com/everkinetic/data>),
projeto de dados abertos baseado em everkinetic.com, criado por Greg Priday, sob a licença
**Creative Commons Attribution-ShareAlike 4.0** (CC BY-SA 4.0,
<https://creativecommons.org/licenses/by-sa/4.0/>).

- Arquivos: `app/src/assets/illustrations/` (com `LICENSE.txt` ao lado).
- Modificações: fundo branco removido, traço pintado com a cor do tema (`currentColor`) e
  coordenadas arredondadas. As versões modificadas seguem sob CC BY-SA 4.0. O código do app não
  é afetado pela licença das imagens.
- O crédito aparece no app ao abrir a ilustração de um exercício.
- Correspondência nome → ilustração: `app/src/data/illustration-map.ts`, conferida visualmente
  exercício a exercício. Para atualizar: clonar o repositório do Everkinetic e rodar
  `node app/scripts/import-illustrations.ts <pasta do clone>`.
