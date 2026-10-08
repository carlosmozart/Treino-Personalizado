// Novidades por versão, mostradas uma vez depois de atualizar (e em Perfil → Sobre).
export interface ReleaseNote { version: string; date: string; items: string[] }

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '3.3.0',
    date: '2026-10',
    items: [
      'Progressão automática de carga: o treino abre com a carga sugerida e o porquê ("+2,5 kg: 12 reps nas 3 séries"). No plano, faixa de reps e quanto subir por exercício. Dá para desligar em Perfil → Treino.',
      'Rotação A/B/C: em Plano, troque a semana fixa pela rotação. O próximo treino é o seguinte ao último feito, em qualquer dia.',
      'Anilhas na barra: no menu ⋯ dos exercícios com barra, quanto pôr de cada lado.',
      'Histórico: "Repetir hoje" refaz um treino passado com os mesmos números.',
      'Treino: "Última vez, há 3 dias" no lugar da data.'
    ]
  },
  {
    version: '3.2.1',
    date: '2026-10',
    items: [
      'Tema claro e escuro (fundo preto), ou seguindo o celular: Perfil → Aparência.',
      'Depois de concluir o treino do dia, a aba Treino mostra "Feito hoje" no lugar de "Começar".',
      'O app procura versão nova sempre que é aberto, sem interromper um treino.'
    ]
  },
  {
    version: '3.2.0',
    date: '2026-10',
    items: [
      'Início: cartão do plano com "Editar plano" e "Novo plano" (modelo pronto, do zero ou com IA).',
      'Perfil: registre o peso direto no campo "Peso atual".',
      'Treino: "Trocar ou cancelar treino" para fazer o treino de outro dia ou desistir sem salvar.',
      'Versão web para iPhone, com instruções para adicionar à Tela de Início.'
    ]
  },
  {
    version: '3.1.0',
    date: '2026-10',
    items: [
      'Modelos de plano prontos: Corpo inteiro, Em casa (peso do corpo), ABC, Superior / Inferior, Push / Pull / Legs e Força 5×5. Em Plano → Planos → "Novo plano a partir de um modelo".',
      'Cada modelo mostra o nível, os dias por semana e os treinos antes de escolher; depois dá para editar tudo.'
    ]
  },
  {
    version: '3.0.0',
    date: '2026-10',
    items: [
      'App refeito do zero, mais rápido e com a mesma cara em qualquer celular. Seus treinos, planos, peso e conquistas vieram junto.',
      'Treino: colunas Carga · Reps, botões de ajuste de carga, menu ⋯ com troca por qualquer exercício, ilustrações dos exercícios e tela ligada durante o treino.',
      'Descanso avisa pelo alarme do Android, com o app aberto ou a tela bloqueada.',
      'Início com a semana, o treino de hoje, peso com gráfico e água.',
      'Plano em cartões por dia, com descanso explícito; montar treino com IA.',
      'Progresso com mapa de calor, volume semanal, evolução por exercício, metas e conquistas.',
      'Backup automático em Downloads/TreinoPersonalizado e botão voltar do Android.'
    ]
  }
];

/** "3.0.0-dev" e "3.0.1" contam como a mesma série de novidades da "3.0". */
export const notesKey = (version: string) => version.replace(/^v/, '').split(/[.-]/).slice(0, 2).join('.');

export function notesToShow(lastSeen: string | undefined, current: string): ReleaseNote | null {
  if (lastSeen && notesKey(lastSeen) === notesKey(current)) return null;
  return RELEASE_NOTES.find(n => notesKey(n.version) === notesKey(current)) ?? null;
}
