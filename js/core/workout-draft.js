// Rascunho e preenchimento inicial do treino, com acesso ao estado corrente.
window.TREINO_WORKOUT_DRAFT = {
  create({ getActiveWorkoutKey, setActiveWorkoutKey, getActiveProfileId, getActiveProfile,
    getFormData, setFormData, todayKey, markWorkoutStart, saveJSON, loadJSON, DRAFT_KEY,
    isStorageAvailable, localStorage, getDailyCompletion, getExerciseHistory,
    getCollapsedIds, getHintsOpen, getNotesOpen, getLastSessionForExercise,
    getEntrySeries, buildSeriesFromHistory, setTimeout, clearTimeout }) {
    let draftSaveTimer = null;

    function saveDraft() {
      if (!getActiveWorkoutKey()) return;
      markWorkoutStart(); // qualquer edicao de valor conta como treino em andamento
      // grava em lote: evita escrever no disco a cada toque nos botões de +/-
      clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(saveDraftNow, 400);
    }

    function saveDraftNow() {
      clearTimeout(draftSaveTimer);
      if (!getActiveWorkoutKey()) return;
      saveJSON(DRAFT_KEY, {
        date: todayKey(),
        profileId: getActiveProfileId(),
        workoutKey: getActiveWorkoutKey(),
        formData: getFormData()
      });
    }

    function loadDraftFor(workoutKey) {
      const draft = loadJSON(DRAFT_KEY);
      if (!draft || !draft.formData) return null;
      // o rascunho só vale para o mesmo dia, o mesmo perfil e o mesmo treino
      if (draft.date !== todayKey()) return null;
      if (draft.profileId && draft.profileId !== getActiveProfileId()) return null;
      if (draft.workoutKey !== workoutKey) return null;
      return draft.formData;
    }

    function clearDraft() {
      clearTimeout(draftSaveTimer);
      if (isStorageAvailable()) { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
    }

    function initializeWorkoutData(key) {
      setActiveWorkoutKey(key);
      const workout = getActiveProfile().schedule[key];
      setFormData({});
      const today = todayKey();
      const completionToday = getDailyCompletion()[today] || {};
      const draft = loadDraftFor(key);
      getCollapsedIds().clear(); // troca de dia começa com todos os cards expandidos, exceto os já concluídos
      getHintsOpen().clear();
      getNotesOpen().clear();
      workout.exercises.forEach(ex => {
        const doneToday = !!completionToday[ex.id];
        const drafted = draft && draft[ex.id];

        // 1º) rascunho de hoje (o que você já digitou); 2º) última sessão da variante em uso;
        // 3º) os valores-alvo cadastrados no plano
        if (drafted) {
          // O rascunho guarda o que você digitou (carga, reps, observação, variante), mas o
          // NOME sempre vem do plano atual — senão renomear um exercício com rascunho aberto
          // deixaria o card preso no nome antigo. Se a reserva escolhida foi apagada do plano,
          // volta para o exercício base.
          if (drafted.customName) {
            // troca avulsa do dia: o nome nao vem do plano, entao e preservado como esta
            getFormData()[ex.id] = Object.assign({}, drafted, { done: doneToday });
          } else {
            const backups = (ex.backups || []).filter(b => b && b.name && b.name.trim());
            let vIdx = drafted.variantIndex || 0;
            if (vIdx > backups.length) vIdx = 0;
            const source = vIdx === 0 ? ex : backups[vIdx - 1];
            getFormData()[ex.id] = Object.assign({}, drafted, {
              name: source.name,
              variantIndex: vIdx,
              done: doneToday
            });
          }
        } else {
          const type = ex.type === 'cardio' ? 'cardio' : 'forca';
          // sem histórico próprio, aproveita o do mesmo exercício em outro perfil
          const saved = getExerciseHistory()[ex.id] || getLastSessionForExercise(ex.id, ex.name);
          // series pre-preenchidas com o que foi feito da ultima vez, uma a uma
          const qtdSeries = (saved && getEntrySeries(saved).length) || ex.targetSets || 3;
          const seriesIniciais = type === 'cardio' ? [] : buildSeriesFromHistory(ex, saved, qtdSeries);
          getFormData()[ex.id] = saved
            ? { name: ex.name, type, variantIndex: 0, series: seriesIniciais, sets: seriesIniciais.length || saved.sets || ex.targetSets, reps: (seriesIniciais[0] && seriesIniciais[0].reps) || saved.reps || ex.targetReps, weight: (seriesIniciais[0] && seriesIniciais[0].weight) || saved.weight || ex.targetWeight, duration: saved.duration || ex.targetDuration || 20, distance: saved.distance || ex.targetDistance || 0, obs: '', done: doneToday }
            : { name: ex.name, type, variantIndex: 0, series: seriesIniciais, sets: seriesIniciais.length || ex.targetSets, reps: ex.targetReps, weight: ex.targetWeight, duration: ex.targetDuration || 20, distance: ex.targetDistance || 0, obs: '', done: doneToday };
        }
        if (doneToday) getCollapsedIds().add(ex.id);
      });
    }
    function cancelPendingSave() { clearTimeout(draftSaveTimer); }
    return { saveDraft, saveDraftNow, loadDraftFor, clearDraft, initializeWorkoutData, cancelPendingSave };
  }
};
