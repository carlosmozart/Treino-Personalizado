// Campos dos exercícios e reservas no editor de planos.
window.TREINO_PLAN_EDITOR_ROWS = {
  create({ document, getEditorState, getSettings, renderDaysPerWeekWarning,
    renderEditorDayOptional, MAX_EXERCISES_PER_DAY, escapeHtml }) {
    function renderExerciseEditorRows() {
      renderDaysPerWeekWarning();
      renderEditorDayOptional(); // a contagem de dias com exercícios pode ter mudado
      const day = getEditorState().schedule[getEditorState().currentDay];
      const listEl = document.getElementById('editorExerciseList');
      document.getElementById('editorExerciseCount').textContent = `${day.exercises.length}/${MAX_EXERCISES_PER_DAY}`;
      document.getElementById('btnAddExerciseRow').disabled = day.exercises.length >= MAX_EXERCISES_PER_DAY;
      document.getElementById('btnAddExerciseRow').classList.toggle('opacity-40', day.exercises.length >= MAX_EXERCISES_PER_DAY);

      if (day.exercises.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-600 text-center py-3">Nenhum exercício neste dia — ele conta como descanso.</p>`;
        return;
      }

      listEl.innerHTML = day.exercises.map((ex, idx) => {
        const isCardio = ex.type === 'cardio';
        const backups = ex.backups || [{ name: '', type: 'forca' }, { name: '', type: 'forca' }];
        const fieldsHtml = isCardio ? `
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[8px] font-bold text-slate-500 uppercase">Tempo (min)</label>
              <input type="number" value="${ex.targetDuration || 0}" oninput="updateExerciseField(${idx},'targetDuration',this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
            <div>
              <label class="text-[8px] font-bold text-slate-500 uppercase">Distância (km) — opcional</label>
              <input type="number" step="0.1" value="${ex.targetDistance || 0}" oninput="updateExerciseField(${idx},'targetDistance',this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[8px] font-bold text-slate-500 uppercase">Séries</label>
              <input type="number" value="${ex.targetSets}" oninput="updateExerciseField(${idx},'targetSets',this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
            <div>
              <label class="text-[8px] font-bold text-slate-500 uppercase">Reps</label>
              <input type="number" value="${ex.targetReps}" oninput="updateExerciseField(${idx},'targetReps',this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
            <div>
              <label class="text-[8px] font-bold text-slate-500 uppercase">Carga (kg)</label>
              <input type="number" step="0.5" value="${ex.targetWeight}" oninput="updateExerciseField(${idx},'targetWeight',this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
          </div>
        `;
        const backupsHtml = [0, 1].map(bIdx => {
          const b = backups[bIdx] || { name: '', type: 'forca' };
          return `
            <div class="flex items-center gap-2">
              <span class="text-[10px] flex-shrink-0">📚</span>
              <input type="text" list="exerciseLibraryList" value="${escapeHtml(b.name || '')}" oninput="updateBackupField(${idx},${bIdx},this.value)" placeholder="Reserva ${bIdx + 1} — digite para buscar" class="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-600"/>
            </div>`;
        }).join('');
        const total = day.exercises.length;
        return `
        <div class="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
          <div class="flex items-center gap-2">
            <div class="flex flex-col gap-0.5 flex-shrink-0">
              <button type="button" onclick="moveExerciseRow(${idx},-1)" ${idx === 0 ? 'disabled' : ''} aria-label="Mover para cima" class="w-7 h-6 rounded-md border border-slate-700 flex items-center justify-center transition-all active:scale-90 ${idx === 0 ? 'opacity-30 text-slate-700' : 'text-slate-300 active:border-blue-600'}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button type="button" onclick="moveExerciseRow(${idx},1)" ${idx === total - 1 ? 'disabled' : ''} aria-label="Mover para baixo" class="w-7 h-6 rounded-md border border-slate-700 flex items-center justify-center transition-all active:scale-90 ${idx === total - 1 ? 'opacity-30 text-slate-700' : 'text-slate-300 active:border-blue-600'}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
            <input type="text" id="exName_${idx}" list="exerciseLibraryList" value="${escapeHtml(ex.name)}" oninput="updateExerciseField(${idx},'name',this.value)" placeholder="Digite para buscar na biblioteca" class="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            <button type="button" onclick="removeExerciseRow(${idx})" aria-label="Remover exercício" class="text-rose-500 hover:text-rose-400 flex-shrink-0 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[8px] font-bold text-slate-500 uppercase">Tipo:</span>
            <button type="button" onclick="toggleExerciseType(${idx})" class="text-[10px] font-black px-2.5 py-1 rounded-full border transition-all ${
              isCardio ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300' : 'bg-blue-950/40 border-blue-700 text-blue-300'
            }">${isCardio ? '🏃 Cardio' : '💪 Força'} — trocar</button>
            <button type="button" onclick="toggleExerciseOptional(${idx})" title="Exercícios opcionais não seguram a conclusão do treino" class="text-[10px] font-black px-2.5 py-1 rounded-full border transition-all ${
              ex.optional ? 'bg-amber-950/40 border-amber-700 text-amber-300' : 'bg-slate-950/60 border-slate-700 text-slate-500'
            }">${ex.optional ? '☆ Opcional' : 'Obrigatório'}</button>
          </div>
          ${ex.optional ? `<p class="text-[9px] text-amber-500/80 leading-relaxed">Não fazer este exercício não impede o treino de ser dado como completo. Se você fizer, ele é registrado normalmente.</p>` : ''}
          ${fieldsHtml}
          <div class="flex items-center gap-2">
            <label class="text-[8px] font-bold text-slate-500 uppercase flex-shrink-0">Descanso (s)</label>
            <input type="number" min="5" max="600" step="5" value="${ex.restSeconds || ''}" oninput="updateExerciseRest(${idx}, this.value)" placeholder="padrão: ${getSettings().restSeconds}" class="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            <span class="text-[8px] text-slate-600">vazio = usa o padrão</span>
          </div>
          <div class="pt-2 mt-1 border-t border-slate-800 space-y-1.5">
            <span class="text-[8px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">🔄 Exercícios Reserva (até 2, opcional)</span>
            ${backupsHtml}
          </div>
        </div>`;
      }).join('');
    }
    return { renderExerciseEditorRows };
  }
};
