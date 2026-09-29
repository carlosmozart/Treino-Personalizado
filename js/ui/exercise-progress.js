// Apresentação dos dados de treino com dependências explícitas.
window.TREINO_EXERCISE_PROGRESS = {
  create({ document, setContext, collectSessionsForExercise, getPersonalRecordFromList, applyChartRange, chartRangeControls, renderSparkline, formatDateBR, describeEntry, chartHint, sessionVolume, getSessionLog, entryDateKey, escapeJs, escapeHtml }) {
    function openExerciseProgress(historyKey, exerciseName) {
      setContext({ historyKey, name: exerciseName });
      const coletado = collectSessionsForExercise(historyKey, exerciseName);
      const list = coletado.sessions;
      document.getElementById('progressExerciseName').textContent = exerciseName || 'Exercício';
      const body = document.getElementById('progressBody');

      if (list.length === 0) {
        body.innerHTML = `<p class="text-xs text-slate-500 text-center py-8 leading-relaxed">Nenhuma sessão registrada ainda.<br/>Finalize um treino com este exercício para começar a acompanhar sua evolução.</p>`;
      } else {
        const isCardio = list[list.length - 1].type === 'cardio';
        const values = list.map(e => isCardio ? (parseFloat(e.duration) || 0) : (parseFloat(e.weight) || 0));
        const first = values[0];
        const last = values[values.length - 1];
        const delta = last - first;
        const unit = isCardio ? 'min' : 'kg';
        const pr = isCardio ? null : getPersonalRecordFromList(list);

        const deltaHtml = list.length < 2 ? '' : `
          <div class="flex items-center justify-center gap-1.5 mt-1">
            <span class="text-xs font-black ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}">
              ${delta > 0 ? '▲' : delta < 0 ? '▼' : '='} ${Math.abs(delta).toFixed(1)}${unit}
            </span>
            <span class="text-[10px] text-slate-600">desde a primeira sessão</span>
          </div>`;

        const noGrafico = applyChartRange('exercicio', list);
        const chartHtml = list.length >= 2
          ? `<div class="mt-4">${chartRangeControls('exercicio', list.length)}</div>
             <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-3">${renderSparkline(noGrafico.map(e => isCardio ? (parseFloat(e.duration) || 0) : (parseFloat(e.weight) || 0)), {
                 color: isCardio ? '#22d3ee' : '#60a5fa',
                 fill: isCardio ? 'rgba(34,211,238,0.14)' : 'rgba(96,165,250,0.14)',
                 tips: noGrafico.map(e => `${formatDateBR(e.date)} · ${describeEntry(e)}`)
               })}
               <div class="flex justify-between mt-1.5 text-[9px] text-slate-600 font-bold">
                 <span>${formatDateBR(noGrafico[0].date)}</span>
                 <span>${formatDateBR(noGrafico[noGrafico.length - 1].date)}</span>
               </div>
               ${chartHint()}
             </div>`
          : `<p class="text-[11px] text-slate-600 text-center py-4">Registre pelo menos duas sessões para ver o gráfico.</p>`;

        const prHtml = pr ? `
          <div class="bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-2.5 mt-4 flex items-center gap-2">
            <span class="text-lg">🏅</span>
            <div class="min-w-0">
              <p class="text-[9px] font-black text-amber-400 uppercase tracking-wider">Recorde pessoal</p>
              <p class="text-xs font-bold text-amber-200">${pr.recordSeries ? `${pr.recordSeries.reps} reps com ${pr.recordSeries.weight}kg` : describeEntry(pr)} · ${formatDateBR(pr.date)}</p>
            </div>
          </div>` : '';

        const rows = list.slice().reverse().slice(0, 20).map(e => {
          const detail = describeEntry(e);
          // (o nome aqui ja vem do cabecalho do modal, entao a linha mostra so os numeros)
          const vol = e.type === 'cardio' ? '' : `<span class="text-[9px] text-slate-600">${Math.round(sessionVolume(e)).toLocaleString('pt-BR')}kg vol.</span>`;
          // so registros da propria chave podem ser corrigidos aqui: os que vem de outro
          // plano pertencem a outra trilha e devem ser editados no contexto deles
          const proprio = (getSessionLog()[historyKey] || []).some(x => entryDateKey(x) === entryDateKey(e));
          const btnEditar = proprio
            ? `<button type="button" onclick="openEditEntry('${escapeJs(historyKey)}','${escapeJs(entryDateKey(e))}')" aria-label="Corrigir registro de ${escapeHtml(formatDateBR(e.date))}" class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 active:border-blue-600 text-slate-400 active:text-blue-300 flex items-center justify-center flex-shrink-0 text-[10px]">✏️</button>`
            : '';
          return `<div class="flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800/60 gap-2">
            <span class="text-[11px] text-slate-400 font-semibold flex-shrink-0">${formatDateBR(e.date)}</span>
            <div class="flex items-center gap-2 min-w-0">
              ${vol}
              <span class="text-xs text-white font-bold truncate">${escapeHtml(detail)}</span>
              ${btnEditar}
            </div>
          </div>`;
        }).join('');

        body.innerHTML = `
          <div class="text-center">
            <p class="text-3xl font-black text-white">${last}<span class="text-base text-slate-500 ml-1">${unit}</span></p>
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Última sessão</p>
            ${deltaHtml}
          </div>
          ${chartHtml}
          ${prHtml}
          <div class="grid grid-cols-2 gap-2 mt-4">
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
              <p class="text-lg font-black text-white">${list.length}</p>
              <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Sessões</p>
            </div>
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
              <p class="text-lg font-black text-white">${Math.max.apply(null, values).toFixed(1)}<span class="text-[10px] text-slate-500">${unit}</span></p>
              <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Melhor marca</p>
            </div>
          </div>
          ${coletado.fromOtherProfiles ? `<p class="text-[10px] text-slate-500 text-center mt-3 bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2">ℹ️ Reunindo sessões deste exercício em todos os seus planos de treino.</p>` : ''}
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-5 mb-2">Histórico</p>
          <div class="space-y-1.5 max-h-56 overflow-y-auto">${rows}</div>
        `;
      }

      document.getElementById('exerciseProgressOverlay').classList.remove('hidden');
    };

    function closeExerciseProgress() {
      document.getElementById('exerciseProgressOverlay').classList.add('hidden');
    };
    return { openExerciseProgress, closeExerciseProgress };
  }
};
