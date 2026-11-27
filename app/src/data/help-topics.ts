// Ajuda do app: onde fica e o que faz cada função, por aba. "go" leva até ela (ver help-nav.ts).
import type { HelpTarget } from '../features/help/help-nav';
import type { Tab } from '../store/ui-store';

/** Seções opcionais: escondidas até a pessoa ligar. */
export type HelpNeeds = 'protocol';

export interface HelpTopic {
  id: string;
  area: Tab;
  title: string;
  /** O caminho até a função, com "›" entre os passos. */
  where: string;
  what: string;
  /** Outras palavras que a pessoa pode buscar. */
  keywords?: string;
  go?: HelpTarget;
  needs?: HelpNeeds;
}

export const HELP_AREAS: readonly { id: Tab; label: string; intro: string }[] = [
  { id: 'inicio', label: 'Início', intro: 'O resumo do dia: o treino de hoje, a semana, o peso e a água.' },
  { id: 'plano', label: 'Plano', intro: 'Onde se monta e se edita o plano de treino.' },
  { id: 'treino', label: 'Treino', intro: 'O treino em andamento, série por série.' },
  { id: 'progresso', label: 'Progresso', intro: 'Gráficos, metas, histórico e o protocolo (quando ligado).' },
  { id: 'perfil', label: 'Perfil', intro: 'Seus dados, as seções opcionais, os ajustes e o backup.' }
];

/** Como ligar cada seção opcional, para a Ajuda explicar quando ela está desligada. */
export const HELP_NEEDS: Record<HelpNeeds, { off: string; go: HelpTarget }> = {
  protocol: { off: 'Está desligado. Ligue em Perfil › Saúde › Protocolo.', go: { tab: 'perfil', anchor: 'protocolo-ligar' } }
};

export const HELP_TOPICS: readonly HelpTopic[] = [
  // ---------- Início ----------
  {
    id: 'hoje', area: 'inicio', title: 'Treino de hoje',
    where: 'Início › cartão do treino de hoje',
    what: 'Mostra o treino do dia pelo seu plano e o botão para começar. Sem plano, é por aqui que se cria o primeiro.',
    keywords: 'começar iniciar dia', go: { tab: 'inicio', anchor: 'hoje' }
  },
  {
    id: 'semana', area: 'inicio', title: 'Semana e dias sem treino',
    where: 'Início › faixa da semana',
    what: 'Os dias treinados ficam verdes. Toque num dia que passou sem treino para anotar o motivo (viagem, doença, descanso) ou registrar outra atividade.',
    keywords: 'sequência motivo falta faltei atividade corrida', go: { tab: 'inicio', anchor: 'semana' }
  },
  {
    id: 'remarcar', area: 'inicio', title: 'Remarcar o treino do dia',
    where: 'Início › cartão do treino de hoje › Hoje não dá: remarcar para outro dia',
    what: 'Passa o treino de hoje para outro dia da semana, sem mexer no plano. Dá para desfazer.',
    keywords: 'mover trocar dia adiar', go: { tab: 'inicio', anchor: 'hoje' }
  },
  {
    id: 'peso', area: 'inicio', title: 'Registrar o peso',
    where: 'Início › Peso › + Registrar (ou Perfil › Seus dados)',
    what: 'Cada pesagem entra no gráfico de peso. Um valor muito diferente do anterior pede confirmação, para pegar dígito trocado.',
    keywords: 'pesagem balança kg', go: { tab: 'inicio', anchor: 'peso' }
  },
  {
    id: 'agua', area: 'inicio', title: 'Água do dia',
    where: 'Início › Água',
    what: 'Toque em + Copo ou + Garrafa para somar o que bebeu. A meta vem do seu peso e da sua atividade (preencha em Perfil › Seus dados).',
    keywords: 'hidratação copo litros', go: { tab: 'inicio', anchor: 'agua' }
  },
  {
    id: 'deload', area: 'inicio', title: 'Semana de deload',
    where: 'Início › Plano de treino › Marcar esta semana como deload',
    what: 'Uma semana leve para recuperar: cerca de 60% da carga. Esses treinos não contam para a progressão. O app também sugere um deload quando as cargas caem.',
    keywords: 'descanso recuperação leve', go: { tab: 'inicio', anchor: 'plano-inicio' }
  },

  // ---------- Plano ----------
  {
    id: 'novo-plano', area: 'plano', title: 'Criar um plano',
    where: 'Início › Plano de treino › Novo plano (ou Plano › Planos)',
    what: 'Escolha um modelo pronto (corpo inteiro, ABC, em casa…), responda cinco perguntas em "Montar meu plano", comece do zero ou peça a uma IA e cole a resposta.',
    keywords: 'modelo montar ia chatgpt novo', go: { tab: 'plano', anchor: 'planos' }
  },
  {
    id: 'editar-dia', area: 'plano', title: 'Editar os exercícios de um dia',
    where: 'Plano › cartão do dia',
    what: 'Toque num exercício para mudar séries, repetições, carga e descanso. "Adicionar exercício" no fim do dia busca na biblioteca.',
    keywords: 'séries repetições carga descanso adicionar', go: { tab: 'plano', anchor: 'dias' }
  },
  {
    id: 'biblioteca', area: 'plano', title: 'Biblioteca de exercícios',
    where: 'Plano › Biblioteca',
    what: 'Todos os exercícios, com ilustração. Dá para favoritar, criar o seu e adicionar um exercício em vários dias de uma vez ("Em vários dias…").',
    keywords: 'exercício favorito criar ilustração', go: { tab: 'plano', anchor: 'biblioteca' }
  },
  {
    id: 'rotacao', area: 'plano', title: 'Dias da semana ou rotação A/B/C',
    where: 'Plano › Como o plano anda',
    what: 'Por dia da semana, cada treino tem o seu dia. Na rotação, o próximo treino é o seguinte ao último feito, em qualquer dia.',
    keywords: 'abc sequência ordem', go: { tab: 'plano', anchor: 'como-anda' }
  },
  {
    id: 'progressao', area: 'plano', title: 'Progressão de carga',
    where: 'Plano › Planos › Progressão de carga (e Perfil › Treino › Carga e progressão)',
    what: 'O treino abre com a carga sugerida pelo histórico e uma linha dizendo o porquê. Prefere repetir a última carga ou a do plano? Mude em Perfil.',
    keywords: 'aumentar carga sugestão automática dupla linear', go: { tab: 'plano', anchor: 'planos' }
  },
  {
    id: 'travar', area: 'plano', title: 'Travar a carga',
    where: 'Plano › toque no exercício › Travar a carga (ou no treino, nos ⋯ do exercício)',
    what: 'O exercício abre sempre com a mesma carga, sem a progressão mexer. O cadeado aparece no cartão.',
    keywords: 'cadeado fixar carga', go: { tab: 'plano', anchor: 'dias' }
  },
  {
    id: 'superset', area: 'plano', title: 'Superset',
    where: 'Plano › toque no exercício › Superset com o próximo exercício',
    what: 'Liga dois exercícios para fazer um atrás do outro; o descanso vem só depois do segundo.',
    keywords: 'bi-set conjugado', go: { tab: 'plano', anchor: 'dias' }
  },
  {
    id: 'compartilhar-plano', area: 'plano', title: 'Compartilhar o plano',
    where: 'Plano › Planos › Compartilhar este plano (arquivo)',
    what: 'Gera um arquivo só com o plano, sem nenhum dado pessoal, para mandar a outra pessoa. Quem recebe usa "Importar plano de um arquivo", no mesmo lugar.',
    keywords: 'enviar arquivo amigo personal', go: { tab: 'plano', anchor: 'planos' }
  },

  // ---------- Treino ----------
  {
    id: 'comecar', area: 'treino', title: 'Começar um treino',
    where: 'Treino › escolha o dia (ou Início › Começar)',
    what: 'Abre o treino do plano. Embaixo dos dias: "Montar o treino de hoje pelos grupos" e "Treino livre, sem seguir o plano".',
    keywords: 'iniciar livre', go: { tab: 'treino' }
  },
  {
    id: 'serie', area: 'treino', title: 'Marcar uma série',
    where: 'Treino › linha da série › ✓',
    what: 'Ajuste carga e repetições e toque no ✓. O descanso começa sozinho. A seta ao lado compara com a última vez.',
    keywords: 'concluir série repetição carga check', go: { tab: 'treino' }
  },
  {
    id: 'menu-serie', area: 'treino', title: 'Opções da série',
    where: 'Treino › toque no número da série',
    what: 'Marca até a falha, drop-set ou rest-pause, anota o esforço (RIR ou RPE, quando ligado em Perfil) e uma nota na série.',
    keywords: 'falha drop rest pause rir rpe esforço nota', go: { tab: 'treino' }
  },
  {
    id: 'menu-exercicio', area: 'treino', title: 'Opções do exercício',
    where: 'Treino › ⋯ no cartão do exercício',
    what: 'Adicionar ou tirar séries e aquecimento, calculadora de anilhas, trocar o exercício, ver o histórico dele, travar a carga ou tirar do treino.',
    keywords: 'trocar anilhas histórico aquecimento remover', go: { tab: 'treino' }
  },
  {
    id: 'anilhas', area: 'treino', title: 'Calculadora de anilhas',
    where: 'Treino › ⋯ do exercício › Anilhas na barra',
    what: 'Diz quanto pôr de cada lado. Cada exercício guarda a sua barra (olímpica, W, hexagonal…), e você marca as anilhas que a academia tem.',
    keywords: 'barra peso lado placas', go: { tab: 'treino' }
  },
  {
    id: 'descanso', area: 'treino', title: 'Descanso e alarme',
    where: 'Treino › barra do descanso (embaixo)',
    what: 'Conta o descanso e avisa no fim, inclusive com a tela bloqueada no Android. Na notificação dá para fazer −15s, +15s e Pular. O tempo padrão fica em Perfil › Treino › Descanso.',
    keywords: 'timer cronômetro notificação alarme som', go: { tab: 'perfil', anchor: 'descanso' }
  },
  {
    id: 'foco', area: 'treino', title: 'Um exercício por vez',
    where: 'Treino › botão ao lado de Concluir, no topo',
    what: 'Mostra só o exercício atual. Deslize o cartão para a esquerda ou a direita para passar de exercício.',
    keywords: 'foco modo deslizar', go: { tab: 'treino' }
  },
  {
    id: 'adicionar-no-treino', area: 'treino', title: 'Adicionar exercício no meio do treino',
    where: 'Treino › fim da lista › Adicionar exercício',
    what: 'Inclui um exercício só no treino de hoje. Depois você decide se ele vai para o plano.',
    keywords: 'incluir extra', go: { tab: 'treino' }
  },
  {
    id: 'gestos', area: 'treino', title: 'Deslizar para apagar ou copiar',
    where: 'Treino › deslize a linha da série',
    what: 'Para a esquerda apaga, para a direita copia. Funciona também nos exercícios do plano, nas pesagens e no histórico. Dá para desligar em Perfil › Treino › Durante o treino.',
    keywords: 'gesto swipe arrastar', go: { tab: 'perfil', anchor: 'durante' }
  },
  {
    id: 'concluir', area: 'treino', title: 'Concluir ou cancelar o treino',
    where: 'Treino › Concluir (no topo)',
    what: 'Salva o treino no histórico e mostra o resumo. Para descartar ou trocar de dia, use "Trocar ou cancelar treino", logo abaixo do tempo.',
    keywords: 'finalizar terminar salvar descartar', go: { tab: 'treino' }
  },

  // ---------- Progresso ----------
  {
    id: 'estatisticas', area: 'progresso', title: 'Estatísticas e gráficos',
    where: 'Progresso › Estatísticas',
    what: 'Volume semanal, séries por grupo muscular, mapa de calor e a evolução de cada exercício. "Organizar esta tela" escolhe o que aparece e em que ordem.',
    keywords: 'gráfico volume evolução calor', go: { tab: 'progresso', view: 'stats', anchor: 'progresso-vistas' }
  },
  {
    id: 'metas', area: 'progresso', title: 'Metas, peso e medidas',
    where: 'Progresso › Metas',
    what: 'Meta de peso com o gráfico das pesagens e as medidas do corpo (cintura, braço, % de gordura…).',
    keywords: 'meta peso medidas cintura gordura', go: { tab: 'progresso', view: 'goals', anchor: 'progresso-vistas' }
  },
  {
    id: 'historico', area: 'progresso', title: 'Histórico dos treinos',
    where: 'Progresso › Histórico',
    what: 'Todos os treinos feitos, por mês. Em cada um: corrigir, mudar a data, reabrir, copiar como texto ou salvar como imagem.',
    keywords: 'treinos feitos passado corrigir whatsapp imagem', go: { tab: 'progresso', view: 'history', anchor: 'progresso-vistas' }
  },
  {
    id: 'treino-passado', area: 'progresso', title: 'Registrar um treino passado ou outra atividade',
    where: 'Progresso › Histórico › Registrar treino passado / Registrar atividade',
    what: 'Para o treino que ficou sem registro, ou uma corrida, futebol, sauna… que entra na semana.',
    keywords: 'esqueci atividade corrida', go: { tab: 'progresso', view: 'history', anchor: 'progresso-vistas' }
  },
  {
    id: 'protocolo', area: 'progresso', title: 'Protocolo: doses, diário e exames',
    where: 'Progresso › Protocolo (e as doses de hoje no Início)',
    what: 'Para quem já faz uso de hormônios, peptídeos ou medicamentos: o histórico de doses, sintomas, pressão, exames e o estoque do frasco. O app só registra; não incentiva o uso nem indica doses.',
    keywords: 'hormônio peptídeo medicamento dose frasco exame', needs: 'protocol', go: { tab: 'progresso', view: 'protocol', anchor: 'progresso-vistas' }
  },

  // ---------- Perfil ----------
  {
    id: 'dados', area: 'perfil', title: 'Seus dados e saúde',
    where: 'Perfil › Seus dados e Saúde',
    what: 'Nome, nascimento, altura, peso e atividade. Com eles o app calcula IMC, metabolismo basal, gasto diário e a meta de água.',
    keywords: 'imc metabolismo calorias altura nome', go: { tab: 'perfil' }
  },
  {
    id: 'ligar-protocolo', area: 'perfil', title: 'Ligar o Protocolo',
    where: 'Perfil › Saúde › Protocolo',
    what: 'Liga a aba Protocolo no Progresso e o cartão das doses no Início. Desligar só esconde: nada é apagado.',
    keywords: 'hormônio peptídeo ativar habilitar', go: { tab: 'perfil', anchor: 'protocolo-ligar' }
  },
  {
    id: 'rpg', area: 'perfil', title: 'Modo RPG',
    where: 'Perfil › topo da tela',
    what: 'Seus treinos viram a evolução de um personagem: classes, missões e atributos. Toque no personagem para abrir a ficha. Aparece depois dos primeiros treinos.',
    keywords: 'personagem jogo classe nível', go: { tab: 'perfil', anchor: 'rpg' }
  },
  {
    id: 'ajustes-treino', area: 'perfil', title: 'Ajustes do treino',
    where: 'Perfil › Treino (ou ⚙ durante o treino)',
    what: 'Descanso, aquecimento automático, carga ao abrir o treino, botões de ajuste de carga, esforço por série (RIR ou RPE), check-in do dia e mais.',
    keywords: 'configurações opções aquecimento rir rpe', go: { tab: 'perfil', anchor: 'ajustes-treino' }
  },
  {
    id: 'lembretes', area: 'perfil', title: 'Lembretes e começo da semana',
    where: 'Perfil › Treino › Avisos e semana',
    what: 'Lembrete nos dias de treino, som e vibração do descanso e se a semana começa no domingo ou na segunda.',
    keywords: 'notificação lembrete alarme domingo segunda', go: { tab: 'perfil', anchor: 'avisos' }
  },
  {
    id: 'aparencia', area: 'perfil', title: 'Tema, cor e tamanho do texto',
    where: 'Perfil › Aparência',
    what: 'Claro, escuro ou do sistema, a cor de destaque, o tamanho do texto e os temas de época.',
    keywords: 'escuro claro cor fonte letra grande', go: { tab: 'perfil', anchor: 'aparencia' }
  },
  {
    id: 'backup', area: 'perfil', title: 'Backup dos dados',
    where: 'Perfil › Dados e backup',
    what: 'Os dados ficam só no aparelho. Faça um backup antes de trocar de celular; dá para pôr senha. No Android há backup automático.',
    keywords: 'salvar exportar importar restaurar celular novo senha', go: { tab: 'perfil', anchor: 'backup' }
  },
  {
    id: 'atualizar', area: 'perfil', title: 'Atualizações, novidades e problemas',
    where: 'Perfil › Sobre',
    what: 'Procura versão nova, mostra as novidades, os créditos, o registro de erros e "Relatar um problema".',
    keywords: 'versão atualizar erro bug relatar', go: { tab: 'perfil', anchor: 'sobre' }
  }
];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca sem acento nem caixa: todas as palavras precisam aparecer no título, no caminho, no texto ou nas palavras-chave. */
export function searchHelp(query: string, topics: readonly HelpTopic[] = HELP_TOPICS): HelpTopic[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...topics];
  return topics.filter(t => {
    const text = normalize(`${t.title} ${t.where} ${t.what} ${t.keywords ?? ''}`);
    return words.every(w => text.includes(w));
  });
}
