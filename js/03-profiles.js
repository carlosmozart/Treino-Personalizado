    // ---------- LISTAGEM DE PERFIS (aba Planos) ----------
    function renderProfileList() {
      const list = document.getElementById('profileList');
      const ids = Object.keys(profiles);
      list.innerHTML = ids.map(id => {
        const p = profiles[id];
        const isActive = id === activeProfileId;
        const totalExercises = DAY_ORDER.reduce((sum, k) => sum + p.schedule[k].exercises.length, 0);
        return `
          <div class="bg-slate-900 rounded-2xl p-4 border ${isActive ? 'border-blue-600' : 'border-slate-800'} shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h4 class="font-extrabold text-white text-sm truncate">${p.name}${isActive ? ' <span class=\"text-[9px] text-blue-400 font-black uppercase align-middle border border-blue-700 rounded-full px-2 py-0.5 ml-1\">Ativo</span>' : ''}</h4>
                <p class="text-xs text-slate-400 mt-1 line-clamp-2">${p.description || 'Sem descrição.'}</p>
                <p class="text-[10px] text-slate-500 mt-2">${p.daysPerWeek} dia${p.daysPerWeek === 1 ? '' : 's'}/semana · ${totalExercises} exercício${totalExercises === 1 ? '' : 's'} cadastrado${totalExercises === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              ${isActive ? '' : `<button type="button" onclick="selectProfile('${id}')" class="flex-1 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/50 text-blue-300 font-bold text-xs py-2 rounded-lg transition-all active:scale-95">Usar Este Perfil</button>`}
              <button type="button" onclick="openProfileEditor('${id}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-lg transition-all active:scale-95">Editar</button>
              ${ids.length > 1 ? `<button type="button" onclick="deleteProfile('${id}')" class="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 font-bold text-xs px-3 py-2 rounded-lg transition-all active:scale-95">Excluir</button>` : ''}
            </div>
          </div>`;
      }).join('');
    }

    // ---------- EDITOR DE PERFIL ----------
    let editorState = null;

    function openProfileEditor(profileId) {
      if (profileId && profiles[profileId]) {
        const p = profiles[profileId];
        editorState = {
          id: profileId,
          name: p.name,
          description: p.description,
          daysPerWeek: p.daysPerWeek,
          schedule: JSON.parse(JSON.stringify(p.schedule)),
          currentDay: 'SEG'
        };
        document.getElementById('editorTitle').textContent = 'Editar Perfil';
      } else {
        editorState = {
          id: null,
          name: '',
          description: '',
          daysPerWeek: 6,
          schedule: buildEmptySchedule(),
          currentDay: 'SEG'
        };
        document.getElementById('editorTitle').textContent = 'Novo Perfil';
      }
      document.getElementById('editorName').value = editorState.name;
      document.getElementById('editorDescription').value = editorState.description;
      document.getElementById('editorDaysPerWeek').value = editorState.daysPerWeek;

      renderEditorDayTabs();
      selectEditorDay('SEG');

      document.getElementById('profileListWrap').classList.add('hidden');
      document.getElementById('profileEditorWrap').classList.remove('hidden');
    }

    function closeProfileEditor() {
      editorState = null;
      document.getElementById('profileEditorWrap').classList.add('hidden');
      document.getElementById('profileListWrap').classList.remove('hidden');
    }

    function renderEditorDayTabs() {
      const wrap = document.getElementById('editorDayTabs');
      wrap.innerHTML = DAY_ORDER.map(key => {
        const hasExercises = editorState.schedule[key].exercises.length > 0;
        const isCurrent = key === editorState.currentDay;
        return `<button type="button" onclick="selectEditorDay('${key}')" class="py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
          isCurrent ? 'bg-blue-600 text-white' : hasExercises ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50' : 'bg-slate-950 text-slate-500 border border-slate-800'
        }">${key}</button>`;
      }).join('');
    }

    function selectEditorDay(key) {
      // salva o nome/foco do dia anterior antes de trocar
      if (editorState.currentDay) {
        const prevDay = editorState.schedule[editorState.currentDay];
        prevDay.name = document.getElementById('editorDayName').value.trim() || prevDay.name;
        prevDay.focus = document.getElementById('editorDayFocus').value.trim();
      }
      editorState.currentDay = key;
      const day = editorState.schedule[key];
      document.getElementById('editorDayName').value = day.name;
      document.getElementById('editorDayFocus').value = day.focus;
      renderEditorDayTabs();
      renderExerciseEditorRows();
    }

    function renderExerciseEditorRows() {
      const day = editorState.schedule[editorState.currentDay];
      const listEl = document.getElementById('editorExerciseList');
      document.getElementById('editorExerciseCount').textContent = `${day.exercises.length}/${MAX_EXERCISES_PER_DAY}`;
      document.getElementById('btnAddExerciseRow').disabled = day.exercises.length >= MAX_EXERCISES_PER_DAY;
      document.getElementById('btnAddExerciseRow').classList.toggle('opacity-40', day.exercises.length >= MAX_EXERCISES_PER_DAY);

      if (day.exercises.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-600 text-center py-3">Nenhum exercício neste dia — ele conta como descanso.</p>`;
        return;
      }

      const libraryOptions = Object.keys(EXERCISE_LIBRARY).map(group =>
        `<optgroup label="${group}">${EXERCISE_LIBRARY[group].map(name => `<option value="${name}">${name}</option>`).join('')}</optgroup>`
      ).join('');

      listEl.innerHTML = day.exercises.map((ex, idx) => {
        const isCardio = ex.type === 'cardio';
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
        return `
        <div class="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
          <div class="flex items-center gap-2">
            <select onchange="if(this.value){applyLibraryPick(${idx},this.value);} this.selectedIndex=0;" class="flex-shrink-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-600 w-[88px]">
              <option value="">📚 Base</option>
              ${libraryOptions}
            </select>
            <input type="text" id="exName_${idx}" value="${ex.name}" oninput="updateExerciseField(${idx},'name',this.value)" placeholder="Nome do exercício" class="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            <button type="button" onclick="removeExerciseRow(${idx})" class="text-rose-500 hover:text-rose-400 flex-shrink-0 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[8px] font-bold text-slate-500 uppercase">Tipo:</span>
            <button type="button" onclick="toggleExerciseType(${idx})" class="text-[10px] font-black px-2.5 py-1 rounded-full border transition-all ${
              isCardio ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300' : 'bg-blue-950/40 border-blue-700 text-blue-300'
            }">${isCardio ? '🏃 Cardio' : '💪 Força'} — trocar</button>
          </div>
          ${fieldsHtml}
        </div>`;
      }).join('');
    }

    window.applyLibraryPick = function(idx, name) {
      const day = editorState.schedule[editorState.currentDay];
      if (!day.exercises[idx]) return;
      day.exercises[idx].name = name;
      day.exercises[idx].type = isCardioExerciseName(name) ? 'cardio' : 'forca';
      renderExerciseEditorRows();
    };

    window.toggleExerciseType = function(idx) {
      const day = editorState.schedule[editorState.currentDay];
      if (!day.exercises[idx]) return;
      day.exercises[idx].type = day.exercises[idx].type === 'cardio' ? 'forca' : 'cardio';
      renderExerciseEditorRows();
    };

    window.updateExerciseField = function(idx, field, value) {
      const day = editorState.schedule[editorState.currentDay];
      if (!day.exercises[idx]) return;
      day.exercises[idx][field] = (field === 'name') ? value : (parseFloat(value) || 0);
    };

    window.addExerciseRow = function() {
      const day = editorState.schedule[editorState.currentDay];
      if (day.exercises.length >= MAX_EXERCISES_PER_DAY) {
        showToast(`⚠️ Limite de ${MAX_EXERCISES_PER_DAY} exercícios por dia atingido.`);
        return;
      }
      day.exercises.push({ id: makeId('ex'), name: '', type: 'forca', targetSets: 3, targetReps: 10, targetWeight: 0, targetDuration: 20, targetDistance: 0 });
      renderExerciseEditorRows();
      renderEditorDayTabs();
    };

    window.removeExerciseRow = function(idx) {
      const day = editorState.schedule[editorState.currentDay];
      day.exercises.splice(idx, 1);
      renderExerciseEditorRows();
      renderEditorDayTabs();
    };

    window.saveProfileFromEditor = function() {
      const name = document.getElementById('editorName').value.trim();
      if (!name) { showToast('⚠️ Dê um nome ao perfil antes de salvar.'); return; }
      const daysPerWeek = Math.min(7, Math.max(1, parseInt(document.getElementById('editorDaysPerWeek').value, 10) || 6));

      // garante que o dia atualmente aberto no editor seja salvo antes de persistir
      const prevDay = editorState.schedule[editorState.currentDay];
      prevDay.name = document.getElementById('editorDayName').value.trim() || prevDay.name;
      prevDay.focus = document.getElementById('editorDayFocus').value.trim();

      const id = editorState.id || makeId('profile');
      profiles[id] = {
        id,
        name,
        description: document.getElementById('editorDescription').value.trim(),
        daysPerWeek,
        schedule: editorState.schedule,
        createdAt: profiles[id] ? profiles[id].createdAt : todayKey(),
        updatedAt: todayKey()
      };
      saveJSON(PROFILES_KEY, profiles);
      showToast(editorState.id ? 'Perfil atualizado!' : 'Perfil criado!');
      closeProfileEditor();
      renderProfileList();
      checkAchievements();

      // se o perfil editado é o ativo, atualiza a tela de treino imediatamente
      if (id === activeProfileId) {
        renderWorkoutSelectOptions();
        const startKey = getTodaysWorkoutKey();
        if (workoutSelect.querySelector(`option[value="${startKey}"]`)) workoutSelect.value = startKey;
        initializeWorkoutData(workoutSelect.value);
        renderHeader();
        renderExercises();
      }
    };

    function todayKey(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    }

    // Mapeia o dia da semana do navegador (0=domingo) para a chave do treino correspondente
    const DOW_TO_KEY = { 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB', 0: 'DOM' };
    function getTodaysWorkoutKey() {
      return DOW_TO_KEY[new Date().getDay()];
    }

    function renderWorkoutSelectOptions() {
      const profile = getActiveProfile();
      document.getElementById('activeProfileLabel').textContent = profile.name;
      workoutSelect.innerHTML = DAY_ORDER.map(key => {
        const day = profile.schedule[key];
        const restTag = day.exercises.length === 0 ? ' (Descanso)' : '';
        return `<option value="${key}">${DAY_FULL_NAMES[key]}: ${day.name.includes(':') ? day.name.split(':').slice(1).join(':').trim() : day.name}${restTag}</option>`;
      }).join('');
    }
