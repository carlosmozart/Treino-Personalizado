// Controles de séries, conclusão e proteção contra cargas digitadas por engano.
window.TREINO_SERIES_ACTIONS = {
  create({ getFormData, getGamification, getSettings, workoutSeries, getSeries,
      getHistoryKey, collectSessionsForExercise, getEntrySeries, getExerciseDef,
      saveDraft, saveDraftNow, askConfirm, escapeHtml, renderExerciseCard,
      markWorkoutStart, toggleDone, startRestTimer, getRestSecondsFor,
      saveJSON, GAMIFICATION_KEY, checkAchievements }) {
    function isSuspiciousWeight(exId, state, valor) {
      const w = parseFloat(valor) || 0;
      if (w <= 0) return null;
      const chave = getHistoryKey(exId, state.variantIndex || 0, state.customName);
      const { sessions } = collectSessionsForExercise(chave, state.name);
      let maxHist = 0;
      sessions.forEach(e => getEntrySeries(e).forEach(sr => { if (sr.weight > maxHist) maxHist = sr.weight; }));

      // O alvo e o erro de digitacao (um digito a mais), nao a progressao ousada. Subir de
      // 40 para 85kg e um salto grande porem possivel; 600 nao e. O limiar de 2,5x deixa
      // passar a progressao real e barra o absurdo.
      const dividido = Math.round(w / 10 * 10) / 10 / 1;   // valor com um digito a menos
      const sugestao = (w >= 100 && Number.isFinite(dividido)) ? (Math.round(w / 10 * 100) / 100) : null;

      if (maxHist > 0) {
        if (w > maxHist * 2.5) {
          // so sugere o valor dividido por 10 quando ele fica perto do historico —
          // caso classico do 600 no lugar de 60
          const plausivel = sugestao !== null && sugestao <= maxHist * 2.5 && sugestao > maxHist * 0.3;
          return { max: maxHist, sugestao: plausivel ? sugestao : null };
        }
        return null;
      }
      // sem historico: so barra o que nao existe em academia nenhuma
      if (w > 500) return { max: 0, sugestao: sugestao };
      return null;
    }

    function updateSeriesField(exId, idx, campo, valor) {
      const state = getFormData()[exId];
      if (!state) return;
      const ex = getExerciseDef(exId);
      const series = getSeries(state, ex);
      if (!series[idx]) return;

      let n = parseFloat(valor) || 0;
      if (n < 0) n = 0;
      if (campo === 'weight') n = Math.round(n * 10) / 10;
      else n = Math.round(n);

      series[idx][campo] = n;
      state.series = series;
      // mantem os campos antigos coerentes: alimentam badges e o resumo
      syncLegacyFields(state);
      saveDraft();
    };

    async function confirmSuspiciousWeight(exId, idx, valor) {
      const state = getFormData()[exId];
      if (!state) return;
      const alerta = isSuspiciousWeight(exId, state, valor);
      if (!alerta) return;

      const ok = await askConfirm({
        icon: '🤔',
        title: 'Conferir a carga',
        text: (alerta.max > 0
          ? `Você digitou <strong class="text-white">${escapeHtml(valor)}kg</strong>, bem acima do seu melhor registro neste exercício (<strong>${alerta.max}kg</strong>).`
          : `Você digitou <strong class="text-white">${escapeHtml(valor)}kg</strong>.`)
          + (alerta.sugestao ? `<br/>Você quis dizer <strong class="text-white">${alerta.sugestao}kg</strong>?` : '')
          + `<br/><span class="text-slate-500">Um valor errado vira recorde e achata seu gráfico de evolução.</span>`,
        confirmLabel: 'Está correto',
        cancelLabel: 'Corrigir'
      });
      if (!ok) {
        // devolve ao valor anterior conhecido
        const series = getSeries(state, getExerciseDef(exId));
        const ref = series[idx - 1] || series[idx + 1];
        series[idx].weight = ref ? ref.weight : 0;
        syncLegacyFields(state);
        saveDraft();
        renderExerciseCard(exId);
      }
    };

    // Os campos sets/reps/weight continuam existindo no estado porque badges, resumo e o
    // formato antigo dependem deles. Aqui eles refletem as series: reps/carga da primeira.
    function syncLegacyFields(...args) { return workoutSeries.syncLegacyFields(...args); }

    // ---------- SÉRIES CONCLUÍDAS (etapa 1: cronômetro no momento certo) ----------
    // O descanso de verdade acontece ENTRE séries, não depois do exercício inteiro. Marcar
    // cada série serve para o cronômetro disparar na hora certa — os valores de carga e reps
    // continuam sendo um por exercício, como antes. Este estado vive só no rascunho do dia:
    // nada é gravado no histórico permanente, então nenhum dado antigo é afetado.
    // Estado de conclusao passou a viver dentro de cada serie (state.series[i].done).
    // Rascunhos gravados pela 2.7.0-2.10.x ainda trazem o array seriesDone: e lido uma vez
    // aqui, para quem estava no meio de um treino ao atualizar nao perder o que ja marcou.
    function getSeriesDone(...args) { return workoutSeries.getSeriesDone(...args); }

    function toggleSerie(exId, index) {
      const state = getFormData()[exId];
      if (!state || state.type === 'cardio') return;

      getSeriesDone(state);                 // migra rascunho antigo, se houver
      const series = getSeries(state, getExerciseDef(exId));
      if (index < 0 || index >= series.length) return;

      const marcando = !series[index].done;
      if (marcando) markWorkoutStart();
      series[index].done = marcando;
      state.series = series;

      const feitas = series.filter(sr => sr.done).length;
      const total = series.length;
      const todasFeitas = total > 0 && feitas === total;

      // marcar a última série conclui o exercício; desmarcar qualquer uma o reabre.
      // toggleDone cuida do check-in automático, do XP e de salvar o rascunho.
      if (todasFeitas !== !!state.done) {
        toggleDone(exId, true); // já re-renderiza e persiste, preservando a fileira acima
      } else {
        saveDraftNow();
        renderExerciseCard(exId);
      }

      // descanso so ao MARCAR, e nao depois da ultima serie do exercicio
      if (marcando && !todasFeitas && getSettings().restAutoStart) {
        const exDef = getExerciseDef(exId);
        startRestTimer(getRestSecondsFor(exDef), `${state.name} · série ${index + 1}`);
      }
    };

    // Monta a fileira de séries. Cada série é um alvo de toque de 40px, tamanho confortável
    // para acertar de primeira com a mão suada no meio do treino.
    // Uma linha por serie: numero, repeticoes, carga e o botao de concluir. Concluida, a
    // linha esmaece para a proxima ganhar destaque — mantendo o card na altura de sempre.
    function renderSeriesRow(ex, state) {
      if (state.type === 'cardio') return '';
      const series = getSeries(state, ex);
      if (series.length === 0) return '';

      const feitas = series.filter(sr => sr.done).length;

      const linhas = series.map((sr, i) => `
        <div class="flex items-center gap-1.5 ${sr.done ? 'opacity-50' : ''}">
          <span class="w-5 text-[11px] font-black ${sr.done ? 'text-emerald-400' : 'text-slate-500'} text-center flex-shrink-0">${i + 1}</span>

          <div class="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg flex-1 min-w-0">
            <button type="button" onclick="adjustSeries('${ex.id}',${i},'reps',-1)" aria-label="Menos uma repetição na série ${i + 1}" class="w-7 h-9 text-slate-400 active:text-white font-black text-xs flex-shrink-0">−</button>
            <input type="number" inputmode="numeric" value="${sr.reps}" onchange="updateSeriesField('${ex.id}',${i},'reps',this.value)" aria-label="Repetições da série ${i + 1}" class="w-full min-w-0 bg-transparent text-center font-extrabold text-white text-sm focus:outline-none"/>
            <button type="button" onclick="adjustSeries('${ex.id}',${i},'reps',1)" aria-label="Mais uma repetição na série ${i + 1}" class="w-7 h-9 text-slate-400 active:text-white font-black text-xs flex-shrink-0">+</button>
          </div>
          <span class="text-[10px] text-slate-600 font-bold flex-shrink-0">reps</span>

          <div class="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg flex-1 min-w-0">
            <button type="button" onclick="adjustSeries('${ex.id}',${i},'weight',-2.5)" aria-label="Menos carga na série ${i + 1}" class="w-7 h-9 text-slate-400 active:text-white font-black text-xs flex-shrink-0">−</button>
            <input type="number" inputmode="decimal" step="0.5" value="${sr.weight}" onchange="updateSeriesField('${ex.id}',${i},'weight',this.value); confirmSuspiciousWeight('${ex.id}',${i},this.value)" aria-label="Carga da série ${i + 1}" class="w-full min-w-0 bg-transparent text-center font-extrabold text-white text-sm focus:outline-none"/>
            <button type="button" onclick="adjustSeries('${ex.id}',${i},'weight',2.5)" aria-label="Mais carga na série ${i + 1}" class="w-7 h-9 text-slate-400 active:text-white font-black text-xs flex-shrink-0">+</button>
          </div>
          <span class="text-[10px] text-slate-600 font-bold flex-shrink-0">kg</span>

          <button type="button" onclick="toggleSerie('${ex.id}', ${i})"
            aria-pressed="${sr.done ? 'true' : 'false'}"
            aria-label="Série ${i + 1}${sr.done ? ', concluída' : ''}"
            class="w-10 h-9 rounded-lg border-2 font-black text-xs transition-all duration-200 active:scale-90 flex-shrink-0 ${
              sr.done ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-950/60 border-slate-700 text-slate-500 active:border-emerald-600'
            }">${sr.done ? '✓' : '○'}</button>
        </div>`).join('');

      return `
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Séries</span>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-black ${feitas === series.length ? 'text-emerald-400' : 'text-slate-500'}">${feitas}/${series.length}</span>
              <button type="button" onclick="adjustValue('${ex.id}','sets',-1)" aria-label="Remover uma série" class="w-7 h-7 rounded-lg bg-slate-950/60 border border-slate-700 text-slate-400 active:text-white font-black text-xs">−</button>
              <button type="button" onclick="adjustValue('${ex.id}','sets',1)" aria-label="Adicionar uma série" class="w-7 h-7 rounded-lg bg-slate-950/60 border border-slate-700 text-slate-400 active:text-white font-black text-xs">+</button>
            </div>
          </div>
          <div class="space-y-1.5">${linhas}</div>
          <p class="text-[11px] text-slate-600 mt-2">Toque no ○ ao terminar cada série — o descanso começa sozinho.</p>
        </div>`;
    }

    // Soma (ou subtrai) o mesmo valor em todas as series de uma vez.
    function applyWeightToAll(exId, delta) {
      const state = getFormData()[exId];
      if (!state) return;
      const series = getSeries(state, getExerciseDef(exId));
      series.forEach(sr => {
        let n = (parseFloat(sr.weight) || 0) + delta;
        sr.weight = Math.round(Math.max(0, n) * 10) / 10;
      });
      if (delta >= 10 && !getGamification().bigWeightJump) {
        getGamification().bigWeightJump = true;
        saveJSON(GAMIFICATION_KEY, getGamification());
        checkAchievements();
      }
      state.series = series;
      syncLegacyFields(state);
      saveDraft();
      renderExerciseCard(exId);
    };

    // Define a mesma carga em todas as series (campo numerico do topo).
    async function setWeightForAll(exId, valor) {
      const state = getFormData()[exId];
      if (!state) return;
      const n = Math.round(Math.max(0, parseFloat(valor) || 0) * 10) / 10;
      const series = getSeries(state, getExerciseDef(exId));
      series.forEach(sr => { sr.weight = n; });
      state.series = series;
      syncLegacyFields(state);
      saveDraft();
      renderExerciseCard(exId);
      await confirmSuspiciousWeight(exId, 0, n);
    };

    function adjustSeries(exId, idx, campo, delta) {
      const state = getFormData()[exId];
      if (!state) return;
      const series = getSeries(state, getExerciseDef(exId));
      if (!series[idx]) return;
      let n = (parseFloat(series[idx][campo]) || 0) + delta;
      if (n < 0) n = 0;
      series[idx][campo] = campo === 'weight' ? Math.round(n * 10) / 10 : Math.round(n);
      state.series = series;
      syncLegacyFields(state);
      saveDraft();
      renderExerciseCard(exId);
    };
    return { isSuspiciousWeight, updateSeriesField, confirmSuspiciousWeight, syncLegacyFields, getSeriesDone, toggleSerie, renderSeriesRow, applyWeightToAll, setWeightForAll, adjustSeries };
  }
};
