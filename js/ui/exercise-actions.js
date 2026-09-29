// Ações dos exercícios com leitura do estado corrente e efeitos injetados.
window.TREINO_EXERCISE_ACTIONS = {
  create({ document, getFormData, getHintsOpen, getNotesOpen, getCollapsedIds,
    getHintsSeen, getExerciseHistory, getDailyCompletion, getGamification, getCheckins,
    getActiveWorkoutKey, getSettings, getActiveProfile, renderExerciseCard,
    openSwapPicker, saveJSON, HINTS_KEY, getHistoryKey, saveDraftNow, markWorkoutStart,
    getSeries, setTimeout, todayKey, COMPLETION_KEY, areAllExercisesDoneForActiveWorkout,
    startRestTimer, getRestSecondsFor, CHECKIN_KEY, grantCheckinXP, recordWorkoutSessions,
    markWorkoutEnd, showToast, renderCheckinGrid, perfilView, renderWeeklyVolume,
    renderWorkoutHistory, syncLegacyFields, saveDraft }) {
    function toggleExerciseHint(exId) {
      if (getHintsOpen().has(exId)) getHintsOpen().delete(exId);
      else getHintsOpen().add(exId);
      renderExerciseCard(exId);
    };

    function openExerciseNote(exId) {
      getNotesOpen().add(exId);
      renderExerciseCard(exId);
      // leva o cursor direto para o campo recem-aberto
      const campo = document.querySelector(`[data-ex-id="${exId}"] input[oninput^="updateObs"]`);
      if (campo) campo.focus();
    };



    function toggleCollapse(exId) {
      if (getCollapsedIds().has(exId)) getCollapsedIds().delete(exId);
      else getCollapsedIds().add(exId);
      renderExerciseCard(exId);
    };

    function getExerciseDef(exId) {
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      return workout.exercises.find(e => e.id === exId);
    }

    function swapExercise(exId) {
      const exDef = getExerciseDef(exId);
      const state = getFormData()[exId];
      if (!exDef || !state) return;
      const backups = (exDef.backups || []).filter(b => b && b.name && b.name.trim());
      if (backups.length === 0) {
        openSwapPicker(exId); // sem reservas: oferece a biblioteca inteira, ali mesmo
        return;
      }
      if (!getHintsSeen().swap) {
        getHintsSeen().swap = true;
        saveJSON(HINTS_KEY, getHintsSeen());
      }
      delete state.customName; // voltar ao ciclo do plano encerra a troca avulsa
      const currentVariant = state.variantIndex || 0;
      const nextVariant = (currentVariant + 1) % (backups.length + 1); // 0 = original, 1..n = reservas
      const source = nextVariant === 0 ? exDef : backups[nextVariant - 1];
      const newType = source.type === 'cardio' ? 'cardio' : 'forca';

      state.variantIndex = nextVariant;
      state.name = source.name;

      // cada variante (original/reserva 1/reserva 2) tem seu próprio histórico salvo —
      // se já existe um, usa ele (continuidade de progressão daquela reserva específica)
      const historyKey = getHistoryKey(exId, nextVariant, null);
      const savedForVariant = getExerciseHistory()[historyKey];

      if (savedForVariant && savedForVariant.type === newType) {
        state.type = newType;
        if (newType === 'cardio') { state.duration = savedForVariant.duration; state.distance = savedForVariant.distance || 0; }
        else { state.sets = savedForVariant.sets; state.reps = savedForVariant.reps; state.weight = savedForVariant.weight; }
      } else if (newType !== state.type) {
        // tipos diferentes (força ↔ cardio) e sem histórico próprio: usa padrão do tipo
        state.type = newType;
        if (newType === 'cardio') { state.duration = 20; state.distance = 0; }
        else { state.sets = 3; state.reps = 10; state.weight = 0; }
      }
      // mesmo tipo e sem histórico próprio ainda: mantém séries/reps/carga (ou tempo/distância) atuais
      state.swapping = true;
      saveDraftNow(); // a variante escolhida precisa sobreviver a fechar e reabrir o app
      renderExerciseCard(exId);
    };

    function toggleDone(exId, seriesJaAjustadas) {
      const state = getFormData()[exId];
      if (!state) return;
      state.done = !state.done;
      if (state.done) markWorkoutStart();

      // pelo botão redondo, concluir marca todas as séries e reabrir limpa todas
      if (state.type !== 'cardio' && !seriesJaAjustadas) {
        const series = getSeries(state, getExerciseDef(exId));
        series.forEach(sr => { sr.done = state.done; });
        state.series = series;
      }

      if (state.done) {
        getCollapsedIds().delete(exId); // garante que a checkmark toque antes de retrair
        renderExerciseCard(exId);
        setTimeout(() => {
          if (getFormData()[exId] && getFormData()[exId].done) {
            getCollapsedIds().add(exId);
            renderExerciseCard(exId);
          }
        }, 550);
      } else {
        getCollapsedIds().delete(exId); // desmarcar reabre o card para permitir edição
        renderExerciseCard(exId);
      }

      // Persiste imediatamente o estado de conclusão do dia (corrige perda ao reiniciar o app)
      const today = todayKey();
      if (!getDailyCompletion()[today]) getDailyCompletion()[today] = {};
      if (state.done) getDailyCompletion()[today][exId] = true;
      else delete getDailyCompletion()[today][exId];
      saveJSON(COMPLETION_KEY, getDailyCompletion());
      saveDraftNow();

      // Descanso automático ao concluir o exercício pelo botão redondo. Exercícios de força
      // já disparam o descanso série a série, então aqui só o cardio precisa deste caminho —
      // sem isso, concluir a última série iniciaria dois cronômetros seguidos.
      if (state.done && getSettings().restAutoStart && state.type === 'cardio' && !areAllExercisesDoneForActiveWorkout()) {
        startRestTimer(getRestSecondsFor(getExerciseDef(exId)), state.name);
      }

      // Check-in automático: marcar TODOS os exercícios do dia concede XP cheio E registra o
      // treino no histórico. Antes só o check-in acontecia aqui — o app dizia "Treino
      // completo", dava o XP e marcava o calendário, mas nada ia para "Treinos realizados"
      // enquanto o botão Finalizar não fosse tocado.
      if (areAllExercisesDoneForActiveWorkout()) {
        const alreadyFull = getGamification().checkins[today] && getGamification().checkins[today].full;
        getCheckins()[today] = getActiveWorkoutKey();
        saveJSON(CHECKIN_KEY, getCheckins());
        grantCheckinXP(today, true);

        const res = recordWorkoutSessions({ apenasConcluidos: true });
        markWorkoutEnd();
        res.recordes.forEach(n => showToast(`🏅 Novo recorde pessoal: ${n}!`, 'trophy'));
        if (res.falhas.length) showToast(`⚠️ Não foi possível registrar: ${res.falhas.join(', ')}`);

        renderCheckinGrid();
        if (!perfilView.classList.contains('hidden')) { renderWeeklyVolume(); renderWorkoutHistory(); }
        if (!alreadyFull) showToast('✅ Treino completo e registrado no histórico!');
      }
    };

    function adjustValue(exId, field, amount) {
      const state = getFormData()[exId];
      if (!state) return;
      const isDecimal = field === 'distance' || field === 'weight';
      const currentValue = parseFloat(state[field]) || 0;
      let newValue = Math.max(0, currentValue + amount);
      if (isDecimal) newValue = Math.round(newValue * 10) / 10;
      state[field] = newValue;

      if (field === 'sets') {
        // o contador vive no cabeçalho do bloco de séries, redesenhado logo abaixo
        getSeries(state, getExerciseDef(exId)); // ajusta a lista ao novo total
        syncLegacyFields(state);
        renderExerciseCard(exId);
      }
      else if (field === 'duration') document.getElementById(`display-duration-${exId}`).textContent = newValue;
      else if (field === 'distance') document.getElementById(`display-distance-${exId}`).textContent = newValue;

      saveDraft();
    };


    function updateObs(exId, value) {
      if (!getFormData()[exId]) return;
      getFormData()[exId].obs = value;
      saveDraft();
    };
    return { toggleExerciseHint, openExerciseNote, toggleCollapse, getExerciseDef, swapExercise, toggleDone, adjustValue, updateObs };
  }
};
