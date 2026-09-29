// Leitura compatível, registro e recordes das sessões de treino.
window.TREINO_SESSION_HISTORY = {
  create({ getSessionLog, getExerciseHistory, saveSessionLog, normalizeExerciseName, formatLocalDateKey }) {
    function getHistoryKey(exId, variantIndex, customName) {
      // troca avulsa: trilha propria por nome, para nao misturar o historico do slot com o
      // de um exercicio que so entrou uma vez
      if (customName) return `custom__${normalizeExerciseName(customName).replace(/[^a-z0-9]+/g, '_')}`;
      return variantIndex ? `${exId}__v${variantIndex}` : exId;
    }

    // ---------- DOIS FORMATOS DE REGISTRO CONVIVENDO (v2.11.0) ----------
    // Ate a 2.10.x cada exercicio era gravado com UM valor para todas as series:
    //     { sets: 3, reps: 10, weight: 40 }
    // Um treino em piramide (12/10/8) virava "3x10", um numero que nao correspondia a
    // nenhuma serie real. A partir da 2.11.0 grava-se cada serie:
    //     { series: [ {reps:12,weight:40}, {reps:10,weight:40}, {reps:8,weight:37.5} ] }
    // Registros antigos NAO sao convertidos — transformar "3x10" em tres series iguais
    // inventaria uma uniformidade que nunca existiu. As duas formas convivem, e toda
    // leitura passa por aqui.
    function getEntrySeries(entry) {
      if (!entry || entry.type === 'cardio') return [];
      if (Array.isArray(entry.series) && entry.series.length) {
        return entry.series.map(sr => ({
          reps: parseFloat(sr.reps) || 0,
          weight: parseFloat(sr.weight) || 0
        }));
      }
      // formato antigo: representa como N series identicas, apenas para calculo
      const n = Math.max(0, parseInt(entry.sets, 10) || 0);
      const reps = parseFloat(entry.reps) || 0;
      const weight = parseFloat(entry.weight) || 0;
      const out = [];
      for (let i = 0; i < n; i++) out.push({ reps, weight });
      return out;
    }

    // Resumo curto de uma sessao, para listas e badges.
    //   por serie e iguais  -> "3x10 · 40kg"
    //   por serie e variadas -> "12/10/8 · 40kg"  ou  "12/10/8 · 40-37.5kg"
    function describeEntry(entry) {
      if (!entry) return '';
      if (entry.type === 'cardio') {
        return `${entry.duration}min${entry.distance ? ` · ${entry.distance}km` : ''}`;
      }
      const series = getEntrySeries(entry);
      if (series.length === 0) return '--';

      const reps = series.map(x => x.reps);
      const pesos = series.map(x => x.weight);
      const repsIguais = reps.every(r => r === reps[0]);
      const pesosIguais = pesos.every(w => w === pesos[0]);

      const parteReps = repsIguais ? `${series.length}x${reps[0]}` : reps.join('/');
      const menor = Math.min.apply(null, pesos), maior = Math.max.apply(null, pesos);
      const partePeso = pesosIguais ? `${pesos[0]}kg` : `${maior}-${menor}kg`;
      return `${parteReps} · ${partePeso}`;
    }

    // Melhor serie de uma sessao: maior carga, desempate por repeticoes.
    function bestSeriesOf(entry) {
      const series = getEntrySeries(entry);
      if (series.length === 0) return null;
      return series.reduce((best, sr) =>
        (sr.weight > best.weight || (sr.weight === best.weight && sr.reps > best.reps)) ? sr : best,
        series[0]);
    }

    // ---------- HISTÓRICO COMPLETO DE SESSÕES (v2.5.0) ----------
    // Antes o app guardava apenas a ÚLTIMA sessão de cada exercício e sobrescrevia o resto.
    // Agora cada treino finalizado vira uma entrada no log, o que permite ver evolução de
    // carga, volume e recordes pessoais. O formato antigo continua sendo mantido em paralelo
    // (getExerciseHistory()) porque os avisos de "hora de subir a carga" dependem dele.
    const MAX_SESSIONS_PER_EXERCISE = 200; // ~4 anos treinando o mesmo exercício 1x/semana

    // Data de uma entrada, sempre como string comparavel. Registros antigos ou importados
    // podem estar sem data ou com um objeto Date no lugar da string; antes isso fazia
    // `a.date.localeCompare(...)` lancar TypeError e derrubar a finalizacao inteira do treino.
    function entryDateKey(entry) {
      if (!entry) return '';
      const d = entry.date;
      if (typeof d === 'string') return d;
      if (d instanceof Date && !isNaN(d)) return formatLocalDateKey(d);
      return '';
    }

    // Ordenacao por comparacao direta de string. localeCompare aplica regras de colacao do
    // idioma, desnecessarias para datas ISO — e quebra assim que um valor nao e string.
    function compareByDate(a, b) {
      const da = entryDateKey(a), db = entryDateKey(b);
      if (da === db) return 0;
      return da < db ? -1 : 1;
    }

    function recordSession(historyKey, entry) {
      if (!getSessionLog()[historyKey]) getSessionLog()[historyKey] = [];
      // descarta o que nao tem data utilizavel: essas entradas nunca apareceriam no
      // historico de qualquer forma, e ficavam ali so para quebrar a ordenacao
      const list = getSessionLog()[historyKey].filter(e => entryDateKey(e));
      const chave = entryDateKey(entry);

      // um registro por exercício por dia: refinalizar o mesmo treino atualiza, não duplica
      const existingIdx = list.findIndex(e => entryDateKey(e) === chave);
      if (existingIdx >= 0) list[existingIdx] = entry;
      else list.push(entry);

      list.sort(compareByDate);
      getSessionLog()[historyKey] = list.length > MAX_SESSIONS_PER_EXERCISE
        ? list.slice(list.length - MAX_SESSIONS_PER_EXERCISE)
        : list;
    }

    // Volume de uma sessão de força: séries x repetições x carga. É a medida mais honesta de
    // "quanto trabalho foi feito" — subir carga baixando muito as reps pode até reduzir o volume.
    function sessionVolume(entry) {
      if (!entry || entry.type === 'cardio') return 0;
      // soma serie a serie: com cargas diferentes entre series, multiplicar media por
      // quantidade daria um numero que nao corresponde ao trabalho realizado
      return getEntrySeries(entry).reduce((total, sr) => total + sr.reps * sr.weight, 0);
    }

    // Recorde pessoal = maior carga já registrada; empate na carga é desempatado por repetições.
    function getPersonalRecordFromList(list) {
      if (!list || list.length === 0) return null;
      let best = null, bestSr = null;
      list.forEach(e => {
        if (e.type === 'cardio') return;
        const sr = bestSeriesOf(e);   // compara a melhor serie de cada sessao
        if (!sr) return;
        if (!bestSr || sr.weight > bestSr.weight || (sr.weight === bestSr.weight && sr.reps > bestSr.reps)) {
          best = e; bestSr = sr;
        }
      });
      // devolve a sessao com a melhor serie destacada, para quem exibe saber o que mostrar
      return best ? Object.assign({}, best, { recordSeries: bestSr }) : null;
    }

    // Verdadeiro quando a sessão que acabou de ser salva bate o melhor resultado anterior.
    function checkPersonalRecord(historyKey, entry) {
      const list = getSessionLog()[historyKey] || [];
      if (entry.type === 'cardio') return false;
      const previous = list.filter(e => e.date !== entry.date && e.type !== 'cardio');
      if (previous.length === 0) return false; // a primeira vez não conta como recorde

      const nova = bestSeriesOf(entry);
      if (!nova) return false;
      const anterior = getPersonalRecordFromList(previous);
      const melhorAntes = anterior && anterior.recordSeries;
      if (!melhorAntes) return false;

      return nova.weight > melhorAntes.weight ||
             (nova.weight === melhorAntes.weight && nova.reps > melhorAntes.reps);
    }

    // Migração única: quem já usava o app tem uma última sessão por exercício em
    // getExerciseHistory() e nenhum log. Semeia o log com esses dados para o histórico não
    // começar vazio depois de atualizar.
    function migrateHistoryToSessionLog() {
      if (Object.keys(getSessionLog()).length > 0) return;         // já migrado ou já em uso
      if (Object.keys(getExerciseHistory()).length === 0) return;   // instalação nova, nada a migrar
      Object.keys(getExerciseHistory()).forEach(key => {
        const h = getExerciseHistory()[key];
        if (!h || !h.date) return;
        getSessionLog()[key] = [Object.assign({}, h)];
      });
      saveSessionLog();
    }
    return { getHistoryKey, getEntrySeries, describeEntry, bestSeriesOf, entryDateKey, compareByDate, recordSession, sessionVolume, getPersonalRecordFromList, checkPersonalRecord, migrateHistoryToSessionLog };
  }
};
