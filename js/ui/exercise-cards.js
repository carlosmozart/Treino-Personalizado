// Renderização completa e pontual dos cartões de exercícios.
window.TREINO_EXERCISE_CARDS = {
  create({ document, exercisesContainer, getFormData, getCollapsedIds, getHintsOpen,
    getNotesOpen, getHintsSeen, getActiveWorkoutKey, getActiveProfile, getHistoryKey,
    getRestSecondsFor, renderSeriesRow, getCardioHistoryBadge, getPersistentLoadBadge,
    escapeHtml, escapeJs }) {
    function buildExerciseCard(ex, idx, animar) {
        const state = getFormData()[ex.id];
        const isCardio = state.type === 'cardio';
        const isCollapsed = getCollapsedIds().has(ex.id);
        const hasBackups = (ex.backups || []).some(b => b && b.name && b.name.trim());
        const wasSwapping = !!state.swapping;
        const historyKey = getHistoryKey(ex.id, state.variantIndex || 0, state.customName);
        const restSegundos = getRestSecondsFor(ex);
        state.swapping = false;

        const card = document.createElement('div');
        card.dataset.exId = ex.id;
        card.className = `${animar ? 'card-enter ' : ''}bg-slate-900 rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
          state.done ? 'border-emerald-700/70' : 'border-slate-800/80 hover:border-slate-700/80'
        } ${wasSwapping ? 'swap-flash' : ''}`;
        if (animar) card.style.animationDelay = `${idx * 60}ms`;

        const subtitleHtml = isCardio
          ? `<p class="text-xs text-slate-400 mt-0.5">Alvo base: <span class="text-cyan-300 font-semibold">${ex.targetDuration || 0} min</span>${ex.targetDistance ? ` | <span class="text-cyan-300 font-semibold">${ex.targetDistance} km</span>` : ''}</p>`
          : `<p class="text-xs text-slate-400 mt-0.5">Alvo base: <span class="text-slate-300 font-semibold">${ex.targetSets}x${ex.targetReps}</span> | <span class="text-blue-300 font-semibold">${ex.targetWeight} kg</span></p>`;

        const fieldsHtml = isCardio ? `
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tempo (min)</span>
              <div class="flex items-center space-x-3">
                <button type="button" onclick="adjustValue('${ex.id}', 'duration', -5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">-5</button>
                <span id="display-duration-${ex.id}" class="text-lg font-extrabold text-white min-w-[32px] text-center">${state.duration}</span>
                <button type="button" onclick="adjustValue('${ex.id}', 'duration', 5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">+5</button>
              </div>
            </div>
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Distância (km)</span>
              <div class="flex items-center space-x-3">
                <button type="button" onclick="adjustValue('${ex.id}', 'distance', -0.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">-0.5</button>
                <span id="display-distance-${ex.id}" class="text-lg font-extrabold text-cyan-300 min-w-[32px] text-center">${state.distance}</span>
                <button type="button" onclick="adjustValue('${ex.id}', 'distance', 0.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">+0.5</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="bg-slate-950/50 rounded-xl p-3 border border-slate-800 mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Carga para todas as séries</span>
              <span class="text-[11px] text-slate-600">ajuste fino em cada linha abaixo</span>
            </div>
            <div class="flex items-center gap-1 flex-wrap justify-center">
              <button type="button" onclick="applyWeightToAll('${ex.id}', -10)" class="bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 px-1.5 py-1.5 text-[11px] font-black rounded border border-rose-800/50 transition-transform active:scale-90">-10</button>
              <button type="button" onclick="applyWeightToAll('${ex.id}', -5)" class="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 px-1.5 py-1 text-[11px] font-black rounded border border-rose-800/40 transition-transform active:scale-90">-5</button>
              <button type="button" onclick="applyWeightToAll('${ex.id}', -2.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 px-1.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-700/50 transition-transform active:scale-90">-2.5</button>
              <input type="number" step="0.5" id="input-weight-${ex.id}" value="${state.weight}" onchange="setWeightForAll('${ex.id}', this.value)" aria-label="Carga para todas as séries" class="bg-transparent text-center font-extrabold text-white text-base w-16 focus:outline-none"/>
              <button type="button" onclick="applyWeightToAll('${ex.id}', 2.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 px-1.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-700/50 transition-transform active:scale-90">+2.5</button>
              <button type="button" onclick="applyWeightToAll('${ex.id}', 5)" class="bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 px-1.5 py-1 text-[11px] font-black rounded border border-blue-800/30 transition-transform active:scale-90">+5</button>
              <button type="button" onclick="applyWeightToAll('${ex.id}', 10)" class="bg-blue-900/50 hover:bg-blue-800/70 text-blue-300 px-1.5 py-1.5 text-[11px] font-black rounded border border-blue-800/50 transition-transform active:scale-90">+10</button>
            </div>
          </div>
                `;

        const bodyHtml = `
          ${fieldsHtml}
          ${renderSeriesRow(ex, state)}
          <div id="badge-container-${ex.id}">${isCardio ? getCardioHistoryBadge(historyKey, state.name) : getPersistentLoadBadge(historyKey, state.name, state)}</div>
          ${ex.alt ? (
            getHintsOpen().has(ex.id)
              ? `<div class="mt-3 text-amber-300 bg-amber-950/30 border border-amber-800/40 px-3 py-2 rounded-xl text-xs font-medium flex items-start gap-2">
                   <span>💡</span><span class="text-justify flex-1">${escapeHtml(ex.alt)}</span>
                   <button type="button" onclick="toggleExerciseHint('${ex.id}')" aria-label="Ocultar dica" class="text-amber-500 font-black flex-shrink-0">×</button>
                 </div>`
              : `<button type="button" onclick="toggleExerciseHint('${ex.id}')" class="mt-3 text-[11px] font-black text-amber-400/80 active:text-amber-300 flex items-center gap-1">💡 Ver dica deste exercício</button>`
          ) : ''}
          ${(getNotesOpen().has(ex.id) || (state.obs && state.obs.trim()))
            ? `<div class="mt-3">
                 <input type="text" value="${escapeHtml(state.obs)}" placeholder="Como foi? (ex: falhei na última)" oninput="updateObs('${ex.id}', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-700 placeholder-slate-600"/>
               </div>`
            : `<button type="button" onclick="openExerciseNote('${ex.id}')" class="mt-3 text-[11px] font-black text-slate-500 active:text-slate-300 flex items-center gap-1">✏️ Adicionar observação</button>`
          }
          <div class="mt-3 flex items-center gap-2">
            <button type="button" onclick="startRestTimer(${restSegundos}, '${escapeJs(state.name)}')" class="flex-1 bg-slate-950/60 border border-slate-700 active:border-blue-600 text-slate-300 active:text-blue-300 text-[11px] font-black py-2.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5">
              <span>⏱️</span> Descansar ${restSegundos}s
            </button>
            <button type="button" onclick="openExerciseProgress('${historyKey}', '${escapeJs(state.name)}')" class="flex-1 bg-slate-950/60 border border-slate-700 active:border-emerald-600 text-slate-300 active:text-emerald-300 text-[11px] font-black py-2.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5">
              <span>📊</span> Evolução
            </button>
            <button type="button" onclick="openSwapPicker('${ex.id}')" title="Trocar por outro exercício" aria-label="Procurar exercício para substituir ${escapeHtml(state.name)}" class="flex-shrink-0 w-11 h-11 bg-slate-950/60 border border-slate-700 active:border-amber-600 text-slate-300 active:text-amber-300 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center">
              <span class="text-sm">🔍</span>
            </button>
          </div>
        `;

        card.innerHTML = `
          <div class="${isCollapsed ? '' : 'mb-4'}">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center space-x-3 min-w-0 cursor-pointer" onclick="toggleCollapse('${ex.id}')">
                <div class="${isCardio ? 'bg-cyan-950/50 text-cyan-400 border-cyan-900/30' : 'bg-blue-950/50 text-blue-400 border-blue-900/30'} p-2.5 rounded-xl border flex-shrink-0">
                  ${isCardio
                    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>`
                  }
                </div>
                <div class="min-w-0">
                  <h3 class="min-w-0"><button type="button" onclick="showNameTooltip(event, '${escapeJs(state.name)}')" title="${escapeHtml(state.name)}" aria-label="Mostrar nome completo: ${escapeHtml(state.name)}" class="block w-full text-left font-extrabold text-base md:text-lg text-white leading-tight truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${state.done ? 'line-through decoration-emerald-500 decoration-2 text-slate-400' : ''}">${escapeHtml(state.name)}</button></h3>
                  ${ex.optional ? `<span class="inline-block text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded mt-1">☆ Opcional</span>` : ''}
                  ${isCollapsed ? '' : subtitleHtml}
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button type="button" onclick="swapExercise('${ex.id}')" title="${hasBackups ? 'Trocar por exercício reserva' : 'Sem reservas cadastradas'}" class="w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 active:rotate-180 ${hasBackups ? 'bg-slate-950/60 border-slate-700 text-slate-300 hover:border-amber-600 hover:text-amber-400' : 'bg-slate-950/30 border-slate-800 text-slate-700'} ${hasBackups && !getHintsSeen().swap ? 'pulse-glow' : ''}">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                </button>
                <button type="button" onclick="toggleDone('${ex.id}')" title="Marcar como concluído" class="flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90 ${
                  state.done
                    ? 'bg-emerald-600 border-emerald-500 text-white check-pop'
                    : 'bg-slate-950/60 border-slate-700 text-transparent hover:border-emerald-600'
                }">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </button>
                <button type="button" onclick="toggleCollapse('${ex.id}')" title="${isCollapsed ? 'Expandir' : 'Retrair'}" class="w-11 h-11 rounded-full flex items-center justify-center border border-slate-700 bg-slate-950/60 text-slate-400 transition-transform duration-200 active:scale-90">
                  <svg class="w-5 h-5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>
          </div>
          ${isCollapsed ? '' : bodyHtml}
        `;
        return card;
    }

    function renderExercises() {
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      exercisesContainer.innerHTML = '';
      workout.exercises.forEach((ex, idx) => {
        exercisesContainer.appendChild(buildExerciseCard(ex, idx, true));
      });
    }

    // Redesenha apenas o card de um exercicio. Usado quando so ele mudou — marcar concluido,
    // recolher, trocar por reserva, marcar serie. Preserva a rolagem e o foco dos demais
    // campos, que se perdiam quando o container inteiro era reescrito.
    function renderExerciseCard(exId) {
      const workout = getActiveProfile().schedule[getActiveWorkoutKey()];
      const idx = workout.exercises.findIndex(e => e.id === exId);
      if (idx === -1) return renderExercises();

      const antigo = exercisesContainer.querySelector(`[data-ex-id="${exId}"]`);
      if (!antigo) return renderExercises();

      antigo.replaceWith(buildExerciseCard(workout.exercises[idx], idx, false));
    }
    return { buildExerciseCard, renderExercises, renderExerciseCard };
  }
};
