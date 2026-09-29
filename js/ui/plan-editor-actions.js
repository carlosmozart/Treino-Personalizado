// Alterações e salvamento do plano em edição.
window.TREINO_PLAN_EDITOR_ACTIONS = {
  create({ document, getEditorState, getProfiles, getActiveProfileId, isCardioExerciseName,
    renderExerciseEditorRows, MAX_EXERCISES_PER_DAY, showToast, makeId, renderEditorDayTabs,
    askConfirm, escapeHtml, DAY_FULL_NAMES, todayKey, saveJSON, PROFILES_KEY,
    closeProfileEditor, renderProfileList, checkAchievements, renderWorkoutSelectOptions,
    getTodaysWorkoutKey, workoutSelect, initializeWorkoutData, renderHeader, renderExercises,
    syncTrainingReminders }) {
    function updateBackupField(idx, bIdx, value) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      if (!day.exercises[idx]) return;
      if (!day.exercises[idx].backups) day.exercises[idx].backups = [{ name: '', type: 'forca' }, { name: '', type: 'forca' }];
      const existing = day.exercises[idx].backups[bIdx] || { type: 'forca' };
      day.exercises[idx].backups[bIdx] = { name: value, type: isCardioExerciseName(value) ? 'cardio' : (existing.type || 'forca') };
    };

    function toggleExerciseOptional(idx) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      if (!day.exercises[idx]) return;
      day.exercises[idx].optional = !day.exercises[idx].optional;
      renderExerciseEditorRows();
    };

    function toggleExerciseType(idx) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      if (!day.exercises[idx]) return;
      day.exercises[idx].type = day.exercises[idx].type === 'cardio' ? 'forca' : 'cardio';
      renderExerciseEditorRows();
    };

    function updateExerciseField(idx, field, value) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      const ex = day.exercises[idx];
      if (!ex) return;

      if (field !== 'name') { ex[field] = parseFloat(value) || 0; return; }

      ex.name = value;
      // Ao escolher um item da biblioteca, o tipo se ajusta sozinho (era o que os antigos
      // seletores faziam). So re-renderiza quando o tipo REALMENTE muda: redesenhar a cada
      // tecla digitada tiraria o foco do campo no meio da digitacao.
      const novoTipo = isCardioExerciseName(value) ? 'cardio' : (ex.type === 'cardio' && !isCardioExerciseName(value) ? 'forca' : ex.type);
      if (novoTipo !== ex.type) {
        ex.type = novoTipo;
        renderExerciseEditorRows();
      }
    };

    function addExerciseRow() {
      const day = getEditorState().schedule[getEditorState().currentDay];
      if (day.exercises.length >= MAX_EXERCISES_PER_DAY) {
        showToast(`⚠️ Limite de ${MAX_EXERCISES_PER_DAY} exercícios por dia atingido.`);
        return;
      }
      day.exercises.push({ id: makeId('ex'), name: '', type: 'forca', optional: false, targetSets: 3, targetReps: 10, targetWeight: 0, targetDuration: 20, targetDistance: 0, backups: [{ name: '', type: 'forca' }, { name: '', type: 'forca' }] });
      renderExerciseEditorRows();
      renderEditorDayTabs();
    };

    async function removeExerciseRow(idx) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      const ex = day.exercises[idx];
      if (!ex) return;

      const reservas = (ex.backups || []).filter(b => b && b.name && b.name.trim()).length;
      const ok = await askConfirm({
        icon: '🗑️',
        title: 'Remover exercício',
        text: `Remover <strong class="text-white">${escapeHtml(ex.name || 'este exercício')}</strong> de ${escapeHtml(DAY_FULL_NAMES[getEditorState().currentDay])}?` +
              (reservas > 0 ? `<br/><span class="text-slate-500">${reservas} exercício(s) reserva serão removidos junto.</span>` : ''),
        confirmLabel: 'Remover',
        danger: true
      });
      if (!ok) return;

      day.exercises.splice(idx, 1);
      renderExerciseEditorRows();
      renderEditorDayTabs();
    };

    function saveProfileFromEditor() {
      const name = document.getElementById('editorName').value.trim();
      if (!name) { showToast('⚠️ Dê um nome ao perfil antes de salvar.'); return; }
      const daysPerWeek = Math.min(7, Math.max(1, parseInt(document.getElementById('editorDaysPerWeek').value, 10) || 6));

      // garante que o dia atualmente aberto no editor seja salvo antes de persistir
      const prevDay = getEditorState().schedule[getEditorState().currentDay];
      prevDay.name = document.getElementById('editorDayName').value.trim() || prevDay.name;
      prevDay.focus = document.getElementById('editorDayFocus').value.trim();
      // prevDay.optional ja e atualizado por toggleEditorDayOptional()

      const id = getEditorState().id || makeId('profile');
      getProfiles()[id] = {
        id,
        name,
        description: document.getElementById('editorDescription').value.trim(),
        daysPerWeek,
        trainingTime: document.getElementById('editorTrainingTime').value,
        schedule: getEditorState().schedule,
        createdAt: getProfiles()[id] ? getProfiles()[id].createdAt : todayKey(),
        updatedAt: todayKey()
      };
      saveJSON(PROFILES_KEY, getProfiles());
      showToast(getEditorState().id ? 'Perfil atualizado!' : 'Perfil criado!');
      closeProfileEditor();
      renderProfileList();
      checkAchievements();

      // se o perfil editado é o ativo, atualiza a tela de treino imediatamente
      if (id === getActiveProfileId()) {
        renderWorkoutSelectOptions();
        const startKey = getTodaysWorkoutKey();
        if (workoutSelect.querySelector(`option[value="${startKey}"]`)) workoutSelect.value = startKey;
        initializeWorkoutData(workoutSelect.value);
        renderHeader();
        renderExercises();
      }
      syncTrainingReminders(false).catch(() => {});
    };
    return { updateBackupField, toggleExerciseOptional, toggleExerciseType, updateExerciseField, addExerciseRow, removeExerciseRow, saveProfileFromEditor };
  }
};
