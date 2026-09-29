// Lista paginada dos treinos concluídos e sincronização com o calendário.
window.TREINO_WORKOUT_HISTORY_LIST = {
  create({ document, getLimit, setLimit, getHistory, setHistory, buildWorkoutHistory,
    renderWorkoutCalendar, escapeHtml, capitalizar, formatDateWithWeekday, formatDuration }) {
    function showMoreWorkoutHistory() {
      setLimit(getLimit() + 15);
      renderWorkoutHistory();
    };

    function renderWorkoutHistory() {
      const list = document.getElementById('workoutHistoryList');
      const more = document.getElementById('workoutHistoryMore');
      const countEl = document.getElementById('workoutHistoryCount');
      if (!list) return;

      setHistory(buildWorkoutHistory());
      countEl.textContent = getHistory().length;
      renderWorkoutCalendar();   // depende do cache recem-construido

      if (getHistory().length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-600 text-center py-6 leading-relaxed">Nenhum treino registrado ainda.<br/>Finalize um treino para ele aparecer aqui.</p>`;
        more.classList.add('hidden');
        return;
      }

      const visiveis = getHistory().slice(0, getLimit());
      list.innerHTML = visiveis.map(dia => {
        const qtd = dia.exercicios.length;
        const temCardio = dia.exercicios.some(e => e.type === 'cardio');
        const volumeTxt = dia.volume > 0 ? `${Math.round(dia.volume).toLocaleString('pt-BR')}kg` : (temCardio ? 'cardio' : '--');
        return `<button type="button" onclick="openWorkoutDay('${dia.date}')" class="w-full text-left bg-slate-950/50 active:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-800/60 transition-all active:scale-[0.99] flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-bold text-white truncate">${escapeHtml(capitalizar(formatDateWithWeekday(dia.date)))}</p>
            <p class="text-[10px] text-slate-500 font-semibold truncate">${escapeHtml(dia.workoutName)} · ${qtd} exercício${qtd > 1 ? 's' : ''}${dia.minutos ? ` · ${formatDuration(dia.minutos)}` : ''}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-[10px] font-black text-blue-300">${volumeTxt}</span>
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </div>
        </button>`;
      }).join('');

      more.classList.toggle('hidden', getHistory().length <= getLimit());
      if (!more.classList.contains('hidden')) {
        more.textContent = `Ver mais (${getHistory().length - getLimit()} restantes)`;
      }
    }
    return { showMoreWorkoutHistory, renderWorkoutHistory };
  }
};
