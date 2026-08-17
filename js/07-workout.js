    // ---------- MARCADOR PERSISTENTE DE "HORA DE SUBIR CARGA" ----------
    function getPersistentLoadBadge(exId) {
      const h = exerciseHistory[exId];
      if (!h) return '';
      const r = parseInt(h.reps, 10);
      if (isNaN(r) || r <= 10) return '';
      return `<div class="fade-badge mb-3 text-amber-300 bg-amber-950/40 border border-amber-700/60 px-3 py-2 rounded-xl text-xs font-black flex items-center space-x-2">
        <span>📈 Última sessão (${h.date}): ${h.reps} reps com ${h.weight}kg. Hora de subir a carga!</span>
      </div>`;
    }

    function getCardioHistoryBadge(exId) {
      const h = exerciseHistory[exId];
      if (!h || (!h.duration && !h.distance)) return '';
      const distancePart = h.distance ? `, ${h.distance}km` : '';
      return `<div class="fade-badge mb-3 text-cyan-300 bg-cyan-950/40 border border-cyan-700/60 px-3 py-2 rounded-xl text-xs font-black flex items-center space-x-2">
        <span>🏃 Última sessão (${h.date}): ${h.duration}min${distancePart}</span>
      </div>`;
    }

    function initializeWorkoutData(key) {
      activeWorkoutKey = key;
      const workout = getActiveProfile().schedule[key];
      formData = {};
      const today = todayKey();
      workout.exercises.forEach(ex => {
        const saved = exerciseHistory[ex.id];
        const doneToday = !!(saved && saved.date === today);
        const type = ex.type === 'cardio' ? 'cardio' : 'forca';
        formData[ex.id] = saved
          ? { name: ex.name, type, sets: saved.sets || ex.targetSets, reps: saved.reps || ex.targetReps, weight: saved.weight || ex.targetWeight, duration: saved.duration || ex.targetDuration || 20, distance: saved.distance || ex.targetDistance || 0, obs: '', done: doneToday }
          : { name: ex.name, type, sets: ex.targetSets, reps: ex.targetReps, weight: ex.targetWeight, duration: ex.targetDuration || 20, distance: ex.targetDistance || 0, obs: '', done: false };
      });
    }

    function renderHeader() {
      const workout = getActiveProfile().schedule[activeWorkoutKey];
      workoutNameEl.textContent = workout.name;
      workoutFocusEl.innerHTML = `
        <svg class="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        ${workout.focus}
      `;
    }

    function getProgressionAlert(reps) {
      const r = parseInt(reps, 10);
      if (isNaN(r) || r <= 0) return '';
      if (r > 10) {
        return `<div class="fade-badge mt-3 text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"><span>🔥 Força sobrando! Suba a carga no próximo treino.</span></div>`;
      } else if (r >= 8) {
        return `<div class="fade-badge mt-3 text-blue-400 bg-blue-950/40 border border-blue-800/60 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"><span>⚖️ Base sólida. Massa muscular protegida durante o déficit.</span></div>`;
      } else {
        return `<div class="fade-badge mt-3 text-rose-400 bg-rose-950/40 border border-rose-800/60 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"><span>⚠️ Risco de perda muscular. Tente chegar a pelo menos 8 reps!</span></div>`;
      }
    }

    function renderExercises() {
      const workout = getActiveProfile().schedule[activeWorkoutKey];
      exercisesContainer.innerHTML = '';

      workout.exercises.forEach((ex, idx) => {
        const state = formData[ex.id];
        const isCardio = state.type === 'cardio';
        const card = document.createElement('div');
        card.className = `card-enter bg-slate-900 rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
          state.done ? 'border-emerald-700/70' : 'border-slate-800/80 hover:border-slate-700/80'
        }`;
        card.style.animationDelay = `${idx * 60}ms`;

        const subtitleHtml = isCardio
          ? `<p class="text-xs text-slate-400 mt-0.5">Alvo base: <span class="text-cyan-300 font-semibold">${ex.targetDuration || 0} min</span>${ex.targetDistance ? ` | <span class="text-cyan-300 font-semibold">${ex.targetDistance} km</span>` : ''}</p>`
          : `<p class="text-xs text-slate-400 mt-0.5">Alvo base: <span class="text-slate-300 font-semibold">${ex.targetSets}x${ex.targetReps}</span> | <span class="text-blue-300 font-semibold">${ex.targetWeight} kg</span></p>`;

        const fieldsHtml = isCardio ? `
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tempo (min)</span>
              <div class="flex items-center space-x-3">
                <button type="button" onclick="adjustValue('${ex.id}', 'duration', -5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">-5</button>
                <span id="display-duration-${ex.id}" class="text-lg font-extrabold text-white min-w-[32px] text-center">${state.duration}</span>
                <button type="button" onclick="adjustValue('${ex.id}', 'duration', 5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">+5</button>
              </div>
            </div>
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Distância (km)</span>
              <div class="flex items-center space-x-3">
                <button type="button" onclick="adjustValue('${ex.id}', 'distance', -0.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">-0.5</button>
                <span id="display-distance-${ex.id}" class="text-lg font-extrabold text-cyan-300 min-w-[32px] text-center">${state.distance}</span>
                <button type="button" onclick="adjustValue('${ex.id}', 'distance', 0.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">+0.5</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Séries</span>
              <div class="flex items-center space-x-4">
                <button type="button" onclick="adjustValue('${ex.id}', 'sets', -1)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">-</button>
                <span id="display-sets-${ex.id}" class="text-lg font-extrabold text-white min-w-[24px] text-center">${state.sets}</span>
                <button type="button" onclick="adjustValue('${ex.id}', 'sets', 1)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">+</button>
              </div>
            </div>
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Repetições</span>
              <div class="flex items-center space-x-4">
                <button type="button" onclick="adjustValue('${ex.id}', 'reps', -1)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">-</button>
                <span id="display-reps-${ex.id}" class="text-xl font-black text-blue-400 min-w-[28px] text-center">${state.reps}</span>
                <button type="button" onclick="adjustValue('${ex.id}', 'reps', 1)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-transform active:scale-90">+</button>
              </div>
            </div>
            <div class="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Carga (kg)</span>
              <div class="flex items-center space-x-1.5">
                <button type="button" onclick="adjustValue('${ex.id}', 'weight', -5)" class="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 px-1.5 py-1 text-[10px] font-black rounded border border-rose-800/40 transition-transform active:scale-90">-5</button>
                <button type="button" onclick="adjustValue('${ex.id}', 'weight', -0.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 px-1.5 py-1.5 text-[10px] font-bold rounded-lg border border-slate-700/50 transition-transform active:scale-90">-0.5</button>
                <input type="number" step="0.5" id="input-weight-${ex.id}" value="${state.weight}" onchange="updateWeightDirectly('${ex.id}', this.value)" class="bg-transparent text-center font-extrabold text-white text-base w-14 focus:outline-none"/>
                <button type="button" onclick="adjustValue('${ex.id}', 'weight', 0.5)" class="bg-slate-850 hover:bg-slate-800 text-slate-300 px-1.5 py-1.5 text-[10px] font-bold rounded-lg border border-slate-700/50 transition-transform active:scale-90">+0.5</button>
                <button type="button" onclick="adjustValue('${ex.id}', 'weight', 5)" class="bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 px-1.5 py-1 text-[10px] font-black rounded border border-blue-800/30 transition-transform active:scale-90">+5</button>
              </div>
            </div>
          </div>
        `;

        card.innerHTML = `
          <div class="mb-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="${isCardio ? 'bg-cyan-950/50 text-cyan-400 border-cyan-900/30' : 'bg-blue-950/50 text-blue-400 border-blue-900/30'} p-2.5 rounded-xl border">
                  ${isCardio
                    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>`
                  }
                </div>
                <div>
                  <h3 class="font-extrabold text-base md:text-lg text-white leading-tight ${state.done ? 'line-through decoration-emerald-500 decoration-2 text-slate-400' : ''}">${ex.name}</h3>
                  ${subtitleHtml}
                </div>
              </div>
              <button type="button" onclick="toggleDone('${ex.id}')" title="Marcar como concluído" class="flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90 ${
                state.done
                  ? 'bg-emerald-600 border-emerald-500 text-white check-pop'
                  : 'bg-slate-950/60 border-slate-700 text-transparent hover:border-emerald-600'
              }">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              </button>
            </div>
          </div>
          ${fieldsHtml}
          <div id="badge-container-${ex.id}">${isCardio ? getCardioHistoryBadge(ex.id) : getPersistentLoadBadge(ex.id)}</div>
          <div id="alert-container-${ex.id}">${isCardio ? '' : getProgressionAlert(state.reps)}</div>
          ${ex.alt ? `<div class="mt-3 text-amber-300 bg-amber-950/30 border border-amber-800/40 px-3 py-2 rounded-xl text-xs font-medium flex items-start space-x-2"><span>💡</span><span>${ex.alt}</span></div>` : ''}
          <div class="mt-4">
            <input type="text" value="${state.obs}" placeholder="Observações (Ex: Falha na última repetição, boa execução...)" oninput="updateObs('${ex.id}', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-700 placeholder-slate-600"/>
          </div>
        `;
        exercisesContainer.appendChild(card);
      });
    }

    window.toggleDone = function(exId) {
      const state = formData[exId];
      if (!state) return;
      state.done = !state.done;
      renderExercises();

      // Check-in automático: se marcar TODOS os exercícios do dia como concluídos, concede XP cheio
      const today = todayKey();
      if (areAllExercisesDoneForActiveWorkout()) {
        const alreadyFull = gamification.checkins[today] && gamification.checkins[today].full;
        checkins[today] = activeWorkoutKey;
        saveJSON(CHECKIN_KEY, checkins);
        grantCheckinXP(today, true);
        renderCheckinGrid();
        if (!alreadyFull) showToast('✅ Treino completo! Check-in automático realizado.');
      }
    };

    window.adjustValue = function(exId, field, amount) {
      const state = formData[exId];
      if (!state) return;
      const isDecimal = field === 'distance' || field === 'weight';
      const currentValue = parseFloat(state[field]) || 0;
      let newValue = Math.max(0, currentValue + amount);
      if (isDecimal) newValue = Math.round(newValue * 10) / 10;
      state[field] = newValue;

      if (field === 'sets') document.getElementById(`display-sets-${exId}`).textContent = newValue;
      else if (field === 'reps') {
        document.getElementById(`display-reps-${exId}`).textContent = newValue;
        document.getElementById(`alert-container-${exId}`).innerHTML = getProgressionAlert(newValue);
      }
      else if (field === 'weight') document.getElementById(`input-weight-${exId}`).value = newValue;
      else if (field === 'duration') document.getElementById(`display-duration-${exId}`).textContent = newValue;
      else if (field === 'distance') document.getElementById(`display-distance-${exId}`).textContent = newValue;
    };

    window.updateWeightDirectly = function(exId, value) { if (formData[exId]) formData[exId].weight = Math.max(0, Math.round((parseFloat(value) || 0) * 10) / 10); };
    window.updateObs = function(exId, value) { if (formData[exId]) formData[exId].obs = value; };

    btnGenerate.addEventListener('click', () => {
      const workout = getActiveProfile().schedule[activeWorkoutKey];
      const today = todayKey();
      const wasAllDone = areAllExercisesDoneForActiveWorkout();
      let report = `RESUMO DO TREINO | ${workout.name}\nFoco: ${workout.focus}\n---------------------------------------------\n`;
      workout.exercises.forEach(ex => {
        const state = formData[ex.id];
        if (state) {
          if (state.type === 'cardio') {
            report += `> ${ex.name}: ${state.duration}min${state.distance ? ` | ${state.distance}km` : ''}`;
            exerciseHistory[ex.id] = { type: 'cardio', duration: state.duration, distance: state.distance, date: today };
          } else {
            report += `> ${ex.name}: ${state.sets}x${state.reps} | ${state.weight}kg`;
            exerciseHistory[ex.id] = { type: 'forca', sets: state.sets, reps: state.reps, weight: state.weight, date: today };
          }
          if (state.obs && state.obs.trim() !== '') report += ` [Nota: ${state.obs.trim()}]`;
          report += '\n';
          state.done = true;
        }
      });
      saveJSON(HISTORY_KEY, exerciseHistory);

      // check-in manual: XP cheio se todos os exercícios já estavam concluídos, metade caso contrário
      checkins[today] = activeWorkoutKey;
      saveJSON(CHECKIN_KEY, checkins);
      grantCheckinXP(today, wasAllDone);
      if (!wasAllDone) showToast(`⚠️ Check-in manual sem tudo concluído: +${getHalfCheckinXP()} XP (metade)`);
      renderCheckinGrid();
      renderExercises();

      reportOutput.value = report;
      reportContainer.classList.remove('hidden');
      reportContainer.scrollIntoView({ behavior: 'smooth' });
    });

    btnCopy.addEventListener('click', () => {
      reportOutput.select();
      reportOutput.setSelectionRange(0, 99999);
      try { if (document.execCommand('copy')) showToast('Resumo copiado! Pronto para envio.'); } 
      catch (err) { console.error('Falha ao copiar:', err); }
    });

    workoutSelect.addEventListener('change', (e) => {
      initializeWorkoutData(e.target.value);
      renderHeader();
      renderExercises();
      reportContainer.classList.add('hidden');
    });

    document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);

    window.addEventListener('DOMContentLoaded', () => {
      if (!storageAvailable) {
        const warn = document.createElement('div');
        warn.className = 'max-w-3xl mx-auto px-4 mt-4';
        warn.innerHTML = `<div class="bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-bold px-4 py-3 rounded-xl">⚠️ Armazenamento local indisponível neste navegador/modo. Seu progresso não será salvo entre sessões.</div>`;
        document.querySelector('header').insertAdjacentElement('afterend', warn);
      }
      ensureProfilesSeeded();
      renderWorkoutSelectOptions();
      const startKey = getTodaysWorkoutKey();
      workoutSelect.value = startKey;
      initializeWorkoutData(startKey);
      renderHeader();
      renderExercises();
      renderCheckinGrid();
      renderLevelBar();
      switchView('treino');
      document.getElementById('appVersion').textContent = `v${APP_VERSION}`;
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* offline/local: ignora silenciosamente */ });
      });
    }
