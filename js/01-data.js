    const APP_VERSION = '1.8.0'; // manter sincronizado com CACHE_NAME em sw.js e com o CHANGELOG.md

    const SEED_WORKOUT_DATABASE = {
      SEG: {
        name: "Segunda: Push A (Peito ênfase inferior, Ombro, Tríceps)",
        focus: "Tensão Mecânica e Cadeia de Empurrar",
        exercises: [
          { id: 'seg_1', name: 'Supino Declinado (Máquina)', targetSets: 4, targetReps: 9, targetWeight: 40, alt: 'Sem máquina declinada? Use Mergulho/Dips inclinando o tronco à frente, ou Flexão de braço com pés elevados. Ambos priorizam peitoral inferior.' },
          { id: 'seg_2', name: 'Crossover Polia Alta (de cima p/ baixo)', targetSets: 3, targetReps: 12, targetWeight: 15, alt: 'Foco em peitoral inferior: puxe as polias de cima para baixo, cruzando na frente do quadril.' },
          { id: 'seg_3', name: 'Desenvolvimento Máquina', targetSets: 3, targetReps: 10, targetWeight: 30 },
          { id: 'seg_4', name: 'Tríceps Pulley (Corda)', targetSets: 3, targetReps: 10, targetWeight: 30 }
        ]
      },
      TER: {
        name: "Terça: Pull A (Costas, Bíceps)",
        focus: "Espessura Dorsal e Cadeia de Puxar",
        exercises: [
          { id: 'ter_1', name: 'Puxada Frontal (Polia)', targetSets: 4, targetReps: 10, targetWeight: 55 },
          { id: 'ter_2', name: 'Remada Baixa (Polia)', targetSets: 3, targetReps: 10, targetWeight: 50 },
          { id: 'ter_3', name: 'Rosca Direta (Polia Baixa)', targetSets: 3, targetReps: 10, targetWeight: 25 },
          { id: 'ter_4', name: 'Rosca Martelo (Halteres)', targetSets: 3, targetReps: 10, targetWeight: 14 }
        ]
      },
      QUA: {
        name: "Quarta: Legs A (Adaptado ao Joelho)",
        focus: "Cadeia Posterior e Amplitude Protegida",
        exercises: [
          { id: 'qua_1', name: 'Leg Press 45º (Amplitude Parcial)', targetSets: 3, targetReps: 12, targetWeight: 120, alt: 'Não desça além de ~90° no joelho. Carga moderada, foco em controle, sem travar.' },
          { id: 'qua_2', name: 'Mesa/Cadeira Flexora', targetSets: 4, targetReps: 12, targetWeight: 35 },
          { id: 'qua_3', name: 'Elevação Pélvica (Hip Thrust)', targetSets: 3, targetReps: 12, targetWeight: 30, alt: 'Máquina disputada? Faça Ponte de Glúteo no chão com barra ou halter apoiado no quadril, ou Elevação Pélvica unilateral apoiando as costas no banco.' },
          { id: 'qua_4', name: 'Panturrilha (Leg Press ou em pé)', targetSets: 4, targetReps: 15, targetWeight: 80 }
        ]
      },
      QUI: {
        name: "Quinta: Push B (Peito, Ombro Lateral, Tríceps)",
        focus: "Proteção Articular e Estabilidade",
        exercises: [
          { id: 'qui_1', name: 'Supino Articulado (Pegada Neutra)', targetSets: 4, targetReps: 9, targetWeight: 40 },
          { id: 'qui_2', name: 'Crossover Polia Alta (de cima p/ baixo)', targetSets: 3, targetReps: 12, targetWeight: 15, alt: 'Mesma execução de segunda: reforça peitoral inferior com um segundo estímulo na semana.' },
          { id: 'qui_3', name: 'Elevação Lateral (Halteres)', targetSets: 4, targetReps: 12, targetWeight: 10 },
          { id: 'qui_4', name: 'Tríceps Francês (Polia/Halter)', targetSets: 3, targetReps: 10, targetWeight: 20 }
        ]
      },
      SEX: {
        name: "Sexta: Pull B (Costas Espessura, Bíceps, Core)",
        focus: "Volume Direto e Encerramento da Semana",
        exercises: [
          { id: 'sex_1', name: 'Remada Cavalinho ou Máquina', targetSets: 4, targetReps: 10, targetWeight: 50 },
          { id: 'sex_2', name: 'Pulldown (Corda)', targetSets: 3, targetReps: 12, targetWeight: 30 },
          { id: 'sex_3', name: 'Rosca Scott Máquina', targetSets: 3, targetReps: 10, targetWeight: 25 },
          { id: 'sex_4', name: 'Abdominal (Prancha ou Máquina)', targetSets: 3, targetReps: 15, targetWeight: 20 }
        ]
      },
      SAB: {
        name: "Sábado: Legs B Leve + Lombar",
        focus: "Manutenção Protegida (dia da caminhada de 7km)",
        exercises: [
          { id: 'sab_1', name: 'Cadeira Extensora (Amplitude Parcial, Carga Leve)', targetSets: 3, targetReps: 12, targetWeight: 25, alt: 'Evite a extensão completa do joelho no topo do movimento. Se sentir dor, reduza a carga ou pule este exercício.' },
          { id: 'sab_2', name: 'Stiff/RDL (Halteres Leves)', targetSets: 3, targetReps: 12, targetWeight: 12 },
          { id: 'sab_3', name: 'Panturrilha Sentado (Máquina)', targetSets: 3, targetReps: 15, targetWeight: 70 },
          { id: 'sab_4', name: 'Extensão Lombar Leve (Banco Romano)', targetSets: 3, targetReps: 15, targetWeight: 0 }
        ]
      },
      DOM: {
        name: "Domingo: Extra (Opcional)",
        focus: "Reforço de Peitoral Inferior e Pontos Fracos",
        exercises: [
          { id: 'dom_1', name: 'Crossover Polia Alta (de cima p/ baixo)', targetSets: 3, targetReps: 12, targetWeight: 15, alt: 'Terceiro estímulo semanal para peitoral inferior, se o corpo estiver respondendo bem.' },
          { id: 'dom_2', name: 'Elevação Lateral (Halteres)', targetSets: 3, targetReps: 12, targetWeight: 8 },
          { id: 'dom_3', name: 'Abdominal (Prancha ou Máquina)', targetSets: 3, targetReps: 15, targetWeight: 10 },
          { id: 'dom_4', name: 'Panturrilha (Leg Press ou em pé)', targetSets: 3, targetReps: 15, targetWeight: 70 }
        ]
      }
    };
