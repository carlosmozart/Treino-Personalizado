window.TREINO_AI_PLAN = {
  create({ DAY_ORDER, DAY_FULL_NAMES, buildEmptySchedule, MAX_EXERCISES_PER_DAY, makeId, isCardioExerciseName }) {
    const IMPORT_TIPOS = ['forca', 'tempo', 'cardio'];
    // Tolera =PLANO=, ===PLANO===, [PLANO]: a primeira amostra chegou com os sinais de igual
    // mastigados pelo markdown do chat, que trata uma linha de === como marcacao de titulo.
    function extrairBlocosDoPlano(texto) {
      const blocos = [];
      const re = /[=[\s]*\bPLANO\b[=\]\s]*/g;
      let m;
      while ((m = re.exec(texto)) !== null) {
        const resto = texto.slice(m.index + m[0].length);
        const fim = resto.match(/[=[\s/]*\bFIM\b[=\]\s]*/);
        blocos.push(fim ? resto.slice(0, fim.index) : resto);
      }
      return blocos;
    }

    function parseBlocoDoPlano(bloco) {
      const dias = [], avisos = [];
      // DIA e EX sao os delimitadores de registro, NAO a quebra de linha: uma das amostras
      // chegou com o bloco inteiro numa unica linha, e dividir por \n devolveria um registro so.
      // Algumas IAs trocam apenas o separador depois do marcador ("DIA: SEG"
      // ou "EX - Supino"), mas preservam os campos com |. Aceitamos essas
      // formas previsíveis sem tentar adivinhar planos escritos em prosa.
      const partes = bloco.split(/(?:^|\s)(DIA|EX)\s*(?:\||:|-)\s*/i);

      for (let i = 1; i < partes.length - 1; i += 2) {
        const marcador = partes[i].toUpperCase();
        const campos = String(partes[i + 1]).split('|').map(c => c.trim());
        while (campos.length && campos[campos.length - 1] === '') campos.pop();

        if (marcador === 'DIA') {
          const sigla = (campos[0] || '').toUpperCase().slice(0, 3);
          if (DAY_ORDER.indexOf(sigla) === -1) {
            avisos.push(`Dia não reconhecido: "${campos[0] || ''}" — ignorado.`);
            dias.push(null);   // marcador de dia invalido, para os EX seguintes caírem fora
            continue;
          }
          dias.push({ dia: sigla, nome: campos[1] || '', foco: campos[2] || '', exercicios: [] });
          continue;
        }

        const atual = dias.length ? dias[dias.length - 1] : null;
        const nome = campos[0] || '';
        if (!atual) { avisos.push(`"${nome}" veio antes de qualquer dia — ignorado.`); continue; }
        if (!nome) { avisos.push('Um exercício veio sem nome e foi ignorado.'); continue; }

        let tipo = (campos[1] || 'forca').toLowerCase();
        if (IMPORT_TIPOS.indexOf(tipo) === -1) {
          avisos.push(`Tipo desconhecido em "${nome}" (${campos[1] || 'vazio'}) — tratado como força.`);
          tipo = 'forca';
        }
        const num = (idx, padrao) => {
          if (campos.length <= idx) return padrao;
          const n = parseFloat(String(campos[idx]).replace(/[^0-9.]/g, ''));
          return isFinite(n) && n > 0 ? Math.round(n) : padrao;
        };
        atual.exercicios.push({
          nome, tipo,
          series: num(2, 3),
          valor: num(3, 10),                                   // reps, segundos ou minutos
          carga: num(4, 0),
          alternativa: (campos[5] || '').trim()
        });
      }

      return { dias: dias.filter(d => d && d.exercicios.length), avisos };
    }

    // Com mais de um bloco no texto, vale o maior. O proprio prompt carrega um bloco de
    // exemplo com poucos exercicios: quem colar a conversa inteira faria um interpretador
    // ingenuo importar o exemplo no lugar do plano.
    function parsePlanoDaIA(texto) {
      const blocos = extrairBlocosDoPlano(texto || '');
      if (!blocos.length) return null;
      let melhor = null, melhorN = -1;
      blocos.forEach(b => {
        const r = parseBlocoDoPlano(b);
        const n = r.dias.reduce((t, d) => t + d.exercicios.length, 0);
        if (n > melhorN) { melhor = r; melhorN = n; }
      });
      return melhorN > 0 ? melhor : null;
    }

    // Converte o plano lido para a estrutura de agenda do app, devolvendo junto tudo que
    // precisou ser adaptado — o usuario ve as adaptacoes antes de confirmar.
    function planoParaSchedule(plano) {
      const schedule = buildEmptySchedule();
      const notas = [];
      let totalEx = 0, cardios = 0, tempos = 0;

      plano.dias.forEach(d => {
        const dia = schedule[d.dia];
        dia.name = d.nome || `${DAY_FULL_NAMES[d.dia]}: Treino`;
        dia.focus = d.foco || '';

        let lista = d.exercicios;
        if (lista.length > MAX_EXERCISES_PER_DAY) {
          notas.push(`${d.nome || d.dia}: ${lista.length} exercícios vieram, mas o app aceita ${MAX_EXERCISES_PER_DAY} por dia. Os últimos ${lista.length - MAX_EXERCISES_PER_DAY} ficaram de fora.`);
          lista = lista.slice(0, MAX_EXERCISES_PER_DAY);
        }

        dia.exercises = lista.map(e => {
          const isCardio = e.tipo === 'cardio';
          if (isCardio) cardios++;
          if (e.tipo === 'tempo') tempos++;
          const alt = e.alternativa || '';
          return {
            id: makeId('ex'),
            name: e.nome,
            // "tempo" nao tem equivalente no app: vira forca com os segundos no lugar das
            // repeticoes. E a menos ruim das duas — mandar para cardio somaria segundos como
            // se fossem minutos e sujaria as estatisticas.
            type: isCardio ? 'cardio' : 'forca',
            // cardio entra como opcional: e o exercicio que se faz quando sobra tempo, e
            // travar a conclusao do treino por causa dele foi o problema que a 2.17.0 resolveu
            optional: isCardio,
            targetSets: isCardio ? 1 : e.series,
            targetReps: isCardio ? 10 : e.valor,
            targetWeight: e.carga || 0,
            targetDuration: isCardio ? e.valor : 20,
            targetDistance: 0,
            backups: [
              { name: alt, type: isCardioExerciseName(alt) ? 'cardio' : 'forca' },
              { name: '', type: 'forca' }
            ]
          };
        });
        totalEx += dia.exercises.length;
      });

      if (tempos) notas.push(`${tempos} exercício${tempos > 1 ? 's são contados' : ' é contado'} em segundos (prancha e parecidos). O app ainda não tem esse tipo, então ${tempos > 1 ? 'eles entraram' : 'ele entrou'} como força, com os segundos no lugar das repetições.`);
      if (cardios) notas.push(`${cardios} exercício${cardios > 1 ? 's de cardio entraram marcados' : ' de cardio entrou marcado'} como opcional — não vai segurar a conclusão do treino nos dias em que você pular. Dá para mudar no editor.`);

      return { schedule, notas, totalEx, dias: plano.dias.length };
    }

    return { extrairBlocosDoPlano, parseBlocoDoPlano, parsePlanoDaIA, planoParaSchedule };
  }
};
