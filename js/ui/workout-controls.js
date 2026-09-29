window.TREINO_WORKOUT_CONTROLS = {
  create({
    document,
    window,
    btnGenerate,
    btnCopy,
    reportOutput,
    workoutSelect,
    reportContainer,
    getActiveProfile,
    getActiveWorkoutKey,
    getFormData,
    finalizeWorkout,
    getHalfCheckinXP,
    getFullCheckinXP,
    copyTextToClipboard,
    showToast,
    initializeWorkoutData,
    renderHeader,
    renderExercises,
    saveProfile
  }) {
    function requiredExercisesOf(workout) {
      return (workout.exercises || []).filter(ex => !ex.optional);
    }

    function areAllExercisesDoneForActiveWorkout() {
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      if (!workout.exercises.length) return false;

      const obrigatorios = requiredExercisesOf(workout);
      // um dia SO com exercicios opcionais nao pode se dar por concluido sozinho: com a
      // lista vazia, every() devolveria true de cara e o check-in aconteceria sem que nada
      // tivesse sido feito. Nesse caso basta um exercicio marcado.
      if (obrigatorios.length === 0) {
        return workout.exercises.some(ex => getFormData()[ex.id] && getFormData()[ex.id].done);
      }
      return obrigatorios.every(ex => getFormData()[ex.id] && getFormData()[ex.id].done);
    }

    window.cancelFinishWorkout = function() {
      document.getElementById('confirmFinishOverlay').classList.add('hidden');
    };

    window.confirmFinishWorkout = function() {
      document.getElementById('confirmFinishOverlay').classList.add('hidden');
      finalizeWorkout();
    };

    btnGenerate.addEventListener('click', () => {
      if (areAllExercisesDoneForActiveWorkout()) {
        finalizeWorkout();
        return;
      }
      // treino incompleto: pede confirmação antes de finalizar, já que isso reduz o XP pela metade
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      // conta so os obrigatorios: dizer "3 de 4" incluindo um opcional pulado sugeriria um
      // treino incompleto que na verdade esta completo
      const obrigatorios = requiredExercisesOf(workout);
      const total = obrigatorios.length;
      const doneCount = obrigatorios.filter(ex => getFormData()[ex.id] && getFormData()[ex.id].done).length;
      document.getElementById('confirmFinishText').textContent =
        `Você concluiu ${doneCount} de ${total} exercícios. Finalizar agora vai valer apenas metade do XP do check-in (${getHalfCheckinXP()} XP em vez de ${getFullCheckinXP()} XP). Quer voltar e completar os exercícios restantes, ou finalizar assim mesmo?`;
      document.getElementById('confirmFinishOverlay').classList.remove('hidden');
    });

    btnCopy.addEventListener('click', async () => {
      const ok = await copyTextToClipboard(reportOutput.value);
      showToast(ok ? 'Resumo copiado! Pronto para envio.' : '❌ Não foi possível copiar o resumo.');
    });

    workoutSelect.addEventListener('change', (e) => {
      initializeWorkoutData(e.target.value);
      renderHeader();
      renderExercises();
      reportContainer.classList.add('hidden');
    });

    document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);


    return { requiredExercisesOf, areAllExercisesDoneForActiveWorkout };
  }
};
