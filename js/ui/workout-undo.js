// Desfaz um dia de treino após confirmação explícita na interface.
window.TREINO_WORKOUT_UNDO = {
  create({ buildWorkoutHistory, getGamification, askConfirm, escapeHtml, capitalizar,
    formatDateWithWeekday, getSessionLog, entryDateKey, syncExerciseHistoryFor,
    saveSessionLog, revokeCheckinXP, getCheckins, saveJSON, CHECKIN_KEY,
    getDailyCompletion, COMPLETION_KEY, getWorkoutMeta, WORKOUT_META_KEY,
    todayKey, clearDraft, initializeWorkoutData, getActiveWorkoutKey, closeWorkoutDay,
    invalidateHistory, renderCheckinGrid, renderExercises, perfilView, renderWorkoutHistory, showToast }) {
    async function undoWorkoutDay(dateStr) {
      const dia = buildWorkoutHistory().find(d => d.date === dateStr);
      const qtd = dia ? dia.exercicios.length : 0;
      const xp = (getGamification().checkins[dateStr] && getGamification().checkins[dateStr].amount) || 0;

      const ok = await askConfirm({
        icon: '↩️',
        title: 'Desfazer treino',
        text: `Remover o treino de <strong class="text-white">${escapeHtml(capitalizar(formatDateWithWeekday(dateStr)))}</strong>?<br/>` +
              `<span class="text-slate-500">Serão apagados ${qtd} exercício${qtd === 1 ? '' : 's'} registrado${qtd === 1 ? '' : 's'}, o check-in do dia` +
              (xp ? ` e ${xp} XP` : '') + `.</span><br/><span class="text-rose-300 font-bold">Não dá para desfazer.</span>`,
        confirmLabel: 'Desfazer treino',
        danger: true
      });
      if (!ok) return;

      // remove as sessoes daquele dia em todas as chaves
      Object.keys(getSessionLog()).forEach(k => {
        const restante = (getSessionLog()[k] || []).filter(e => entryDateKey(e) !== dateStr);
        if (restante.length === 0) delete getSessionLog()[k];
        else getSessionLog()[k] = restante;
        syncExerciseHistoryFor(k);
      });
      saveSessionLog();

      revokeCheckinXP(dateStr);          // devolve o XP concedido
      delete getCheckins()[dateStr];
      saveJSON(CHECKIN_KEY, getCheckins());
      delete getDailyCompletion()[dateStr];
      saveJSON(COMPLETION_KEY, getDailyCompletion());
      delete getWorkoutMeta()[dateStr];
      saveJSON(WORKOUT_META_KEY, getWorkoutMeta());

      // se for o dia de hoje, o treino na tela volta a ficar em aberto
      if (dateStr === todayKey()) {
        clearDraft();
        initializeWorkoutData(getActiveWorkoutKey());
      }

      closeWorkoutDay();
      invalidateHistory();
      renderCheckinGrid();
      renderExercises();
      if (!perfilView.classList.contains('hidden')) renderWorkoutHistory();
      showToast('↩️ Treino desfeito.');
    };
    return { undoWorkoutDay };
  }
};
