// Registro e finalização do treino; dados restauráveis consultados por getters.
window.TREINO_WORKOUT_RECORDING = {
  create({ getActiveProfile, getActiveWorkoutKey, todayKey, getDailyCompletion,
      getFormData, getHistoryKey, getSeries, sessionVolume, describeEntry,
      checkPersonalRecord, recordSession, getExerciseHistory, saveJSON,
      COMPLETION_KEY, saveExerciseHistory, saveSessionLog, invalidateWorkoutHistory,
      areAllExercisesDoneForActiveWorkout, markWorkoutEnd, formatDuration,
      buildWorkoutHistory, estimateWorkoutCalories, clearDraft, getCheckins,
      CHECKIN_KEY, grantCheckinXP, getHalfCheckinXP, showToast,
      renderCheckinGrid, renderExercises, perfilView, renderWeeklyVolume,
      renderWorkoutHistory, reportOutput, reportContainer }) {
    function recordWorkoutSessions(opcoes) {
      const opts = opcoes || {};
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      const today = todayKey();
      if (!getDailyCompletion()[today]) getDailyCompletion()[today] = {};

      let volume = 0, linhas = '';
      const falhas = [], recordes = [];

      workout.exercises.forEach(ex => {
        const state = getFormData()[ex.id];
        if (!state) return;
        // registra apenas o que foi de fato realizado: um exercicio deixado de lado nao deve
        // entrar no historico como se tivesse sido feito
        if (opts.apenasConcluidos && !state.done) return;

        try {
          const historyKey = getHistoryKey(ex.id, state.variantIndex || 0, state.customName);
          if (!state.name || !String(state.name).trim()) {
            state.name = (ex.name && ex.name.trim()) ? ex.name : 'Exercício sem nome';
          }

          let entry;
          if (state.type === 'cardio') {
            entry = { type: 'cardio', name: state.name, duration: state.duration, distance: state.distance, date: today };
            linhas += `> ${state.name}: ${state.duration}min${state.distance ? ` | ${state.distance}km` : ''}`;
          } else {
            const seriesFeitas = getSeries(state, ex).map(sr => ({ reps: sr.reps, weight: sr.weight }));
            entry = { type: 'forca', name: state.name, series: seriesFeitas,
                      // sets/reps/weight seguem gravados: telas e versoes anteriores os leem
                      sets: seriesFeitas.length,
                      reps: seriesFeitas.length ? seriesFeitas[0].reps : state.reps,
                      weight: seriesFeitas.length ? seriesFeitas[0].weight : state.weight,
                      date: today };
            volume += sessionVolume(entry);
            linhas += `> ${state.name}: ${describeEntry(entry)}`;
          }

          if (state.obs && state.obs.trim() !== '') {
            entry.obs = state.obs.trim();
            linhas += ` [Nota: ${state.obs.trim()}]`;
          }
          linhas += '\n';

          // o recorde precisa ser conferido ANTES de gravar a sessao de hoje no log
          if (checkPersonalRecord(historyKey, entry)) recordes.push(state.name);
          recordSession(historyKey, entry);
          getExerciseHistory()[historyKey] = entry;

          if (opts.marcarConcluidos) {
            state.done = true;
            getDailyCompletion()[today][ex.id] = true;
          }
        } catch (err) {
          // uma falha pontual nao pode impedir os demais exercicios de serem gravados
          console.error('Falha ao registrar exercício', ex.id, err);
          falhas.push(state.name || ex.name || ex.id);
        }
      });

      saveJSON(COMPLETION_KEY, getDailyCompletion());
      saveExerciseHistory();
      saveSessionLog();
      invalidateWorkoutHistory();
      return { volume, linhas, falhas, recordes };
    }

    function finalizeWorkout() {
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      const today = todayKey();
      const wasAllDone = areAllExercisesDoneForActiveWorkout();
      if (!getDailyCompletion()[today]) getDailyCompletion()[today] = {};
      let report = `RESUMO DO TREINO | ${workout.name}\nFoco: ${workout.focus}\n---------------------------------------------\n`;
      let totalVolume = 0;
      const newRecords = [];

      const resultado = recordWorkoutSessions({ marcarConcluidos: true });
      const falhas = resultado.falhas;
      totalVolume = resultado.volume;
      resultado.recordes.forEach(n => newRecords.push(n));
      report += resultado.linhas;

      const minutos = markWorkoutEnd();
      if (totalVolume > 0 || minutos) {
        report += '---------------------------------------------\n';
        if (totalVolume > 0) report += `Volume total: ${Math.round(totalVolume).toLocaleString('pt-BR')} kg\n`;
        if (minutos) report += `Duração: ${formatDuration(minutos)}\n`;
        // o historico ja foi gravado acima, entao o dia de hoje ja esta montado com a duracao
        const hojeNoHistorico = buildWorkoutHistory().find(d => d.date === today);
        const kcalHoje = hojeNoHistorico ? estimateWorkoutCalories(hojeNoHistorico) : null;
        if (kcalHoje) report += `Gasto estimado: ~${kcalHoje.kcal.toLocaleString('pt-BR')} kcal\n`;
      }

      clearDraft(); // treino fechado: o rascunho do dia já virou histórico

      // check-in manual: XP cheio se todos os exercícios já estavam concluídos, metade caso contrário
      getCheckins()[today] = getActiveWorkoutKey();
      saveJSON(CHECKIN_KEY, getCheckins());
      grantCheckinXP(today, wasAllDone);
      if (!wasAllDone) showToast(`⚠️ Check-in manual sem tudo concluído: +${getHalfCheckinXP()} XP (metade)`);
      newRecords.forEach(name => showToast(`🏅 Novo recorde pessoal: ${name}!`, 'trophy'));
      if (falhas.length) showToast(`⚠️ Não foi possível registrar: ${falhas.join(', ')}`);
      renderCheckinGrid();
      renderExercises();
      // o historico acabou de mudar: invalida o cache e redesenha se estiver a vista
      invalidateWorkoutHistory();
      if (!perfilView.classList.contains('hidden')) { renderWeeklyVolume(); renderWorkoutHistory(); }

      reportOutput.value = report;
      reportContainer.classList.remove('hidden');
      reportContainer.scrollIntoView({ behavior: 'smooth' });
    }
    return { recordWorkoutSessions, finalizeWorkout };
  }
};
