window.TREINO_WORKOUT_SUMMARY = {
  create({
    document, workoutSelect, workoutNameEl, workoutFocusEl, getExerciseHistory, getActiveWorkoutKey,
    getActiveProfile, DAY_ORDER, DAY_FULL_NAMES, getLastSessionForExercise, bestSeriesOf, getSeries,
    describeEntry, escapeHtml, EXERCISE_LIBRARY, formatDateBR
  }) {
    function renderWorkoutSelectOptions() {
      const profile = getActiveProfile();
      document.getElementById('activeProfileLabel').textContent = profile.name;
      workoutSelect.innerHTML = DAY_ORDER.map(key => {
        const day = profile.schedule[key];
        const restTag = day.exercises.length === 0 ? ' (Descanso)' : (day.optional ? ' (Opcional)' : '');
        return `<option value="${key}">${DAY_FULL_NAMES[key]}: ${day.name.includes(':') ? day.name.split(':').slice(1).join(':').trim() : day.name}${restTag}</option>`;
      }).join('');
    }

    function getPersistentLoadBadge(exId, name, state) {
      const proprio = !!getExerciseHistory()[exId];
      const h = getLastSessionForExercise(exId, name);
      if (!h || h.type === 'cardio') return '';

      // base da sugestao: as repeticoes de hoje quando ha um estado em edicao; senao, as da
      // ultima sessao registrada
      const melhorHoje = state ? bestSeriesOf({ type: 'forca', series: getSeries(state, null) }) : null;
      const melhorAntes = bestSeriesOf(h);
      const r = melhorHoje ? melhorHoje.reps : (melhorAntes ? melhorAntes.reps : parseInt(h.reps, 10));
      const temReps = !isNaN(r) && r > 0;

      const origem = proprio ? '' : ' <span class="opacity-70">(de outro plano)</span>';
      const marca = escapeHtml(describeEntry(h));

      let cor, sugestao;
      if (!temReps) {
        cor = 'text-slate-300 bg-slate-950/60 border-slate-700';
        sugestao = '';
      } else if (r > 10) {
        cor = 'text-amber-300 bg-amber-950/40 border-amber-700/60';
        sugestao = '🔥 Força sobrando — hora de subir a carga!';
      } else if (r >= 8) {
        cor = 'text-blue-300 bg-blue-950/40 border-blue-800/60';
        sugestao = '⚖️ Base sólida — tente somar mais uma repetição.';
      } else {
        cor = 'text-slate-300 bg-slate-950/60 border-slate-700';
        sugestao = '⚠️ Busque chegar a 8 antes de subir a carga.';
      }

      return `<div class="fade-badge mb-3 ${cor} border px-3 py-2 rounded-xl text-xs font-black">
        <span class="block">📈 Última vez (${escapeHtml(formatDateBR(h.date))}): ${marca}${origem}</span>
        ${sugestao ? `<span class="block mt-1 opacity-90 font-bold">${sugestao}</span>` : ''}
      </div>`;
    }

    function getCardioHistoryBadge(exId, name) {
      const proprio = !!getExerciseHistory()[exId];
      const h = getLastSessionForExercise(exId, name);
      if (!h || (!h.duration && !h.distance)) return '';
      const distancePart = h.distance ? `, ${escapeHtml(h.distance)}km` : '';
      const origem = proprio ? '' : ' <span class="opacity-70">(de outro plano)</span>';
      return `<div class="fade-badge mb-3 text-cyan-300 bg-cyan-950/40 border border-cyan-700/60 px-3 py-2 rounded-xl text-xs font-black flex items-center space-x-2">
        <span>🏃 Última vez (${escapeHtml(formatDateBR(h.date))}): ${escapeHtml(h.duration)}min${distancePart}${origem}</span>
      </div>`;
    }

    function renderHeader() {
      const profile = getActiveProfile();
      const workout = profile.schedule[getActiveWorkoutKey()];
      workoutNameEl.textContent = workout.name;
      workoutFocusEl.innerHTML = `
        <svg class="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        ${escapeHtml(workout.focus)}
      `;
      const badge = document.getElementById('workoutTimeBadge');
      badge.textContent = profile.trainingTime ? `Horário de Treino: ${profile.trainingTime}` : 'Horário de Treino: não definido';
    }

    function buildExerciseDatalist() {
      const dl = document.getElementById('exerciseLibraryList');
      if (!dl || dl.childElementCount) return; // montada uma vez so
      const html = Object.keys(EXERCISE_LIBRARY).map(grupo =>
        EXERCISE_LIBRARY[grupo].map(nome =>
          `<option value="${escapeHtml(nome)}">${escapeHtml(grupo)}</option>`
        ).join('')
      ).join('');
      dl.innerHTML = html;
    }


    return { renderWorkoutSelectOptions, getPersistentLoadBadge, getCardioHistoryBadge, renderHeader, buildExerciseDatalist };
  }
};
