// Ciclo do editor, navegação dos dias e controles auxiliares.
window.TREINO_PLAN_EDITOR = {
  create({ document, getEditorState, setEditorState, getProfiles, buildEmptySchedule,
    DAY_ORDER, renderExerciseEditorRows, showToast, setTimeout }) {
    function openProfileEditor(profileId) {
      if (profileId && getProfiles()[profileId]) {
        const p = getProfiles()[profileId];
        setEditorState({
          id: profileId,
          name: p.name,
          description: p.description,
          daysPerWeek: p.daysPerWeek,
          trainingTime: p.trainingTime || '',
          schedule: JSON.parse(JSON.stringify(p.schedule)),
          currentDay: 'SEG'
        });
        document.getElementById('editorTitle').textContent = 'Editar Perfil';
      } else {
        setEditorState({
          id: null,
          name: '',
          description: '',
          daysPerWeek: 6,
          trainingTime: '',
          schedule: buildEmptySchedule(),
          currentDay: 'SEG'
        });
        document.getElementById('editorTitle').textContent = 'Novo Perfil';
      }
      document.getElementById('editorName').value = getEditorState().name;
      document.getElementById('editorDescription').value = getEditorState().description;
      document.getElementById('editorDaysPerWeek').value = getEditorState().daysPerWeek;
      setTimeout(renderDaysPerWeekWarning, 0); // depois que o restante do editor montar
      document.getElementById('editorTrainingTime').value = getEditorState().trainingTime;

      renderEditorDayTabs();
      selectEditorDay('SEG');

      document.getElementById('profileListWrap').classList.add('hidden');
      document.getElementById('profileEditorWrap').classList.remove('hidden');
    }

    function closeProfileEditor() {
      setEditorState(null);
      document.getElementById('profileEditorWrap').classList.add('hidden');
      document.getElementById('profileListWrap').classList.remove('hidden');
    }

    function renderEditorDayTabs() {
      const wrap = document.getElementById('editorDayTabs');
      wrap.innerHTML = DAY_ORDER.map(key => {
        const dia = getEditorState().schedule[key];
        const hasExercises = dia.exercises.length > 0;
        const isOptional = !!dia.optional && hasExercises;
        const isCurrent = key === getEditorState().currentDay;
        // dia opcional recebe tom ambar: tem treino, mas nao quebra a sequencia se faltar
        const cor = isCurrent
          ? 'bg-blue-600 text-white'
          : isOptional
            ? 'bg-amber-950/40 text-amber-400 border border-amber-800/50'
            : hasExercises
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
              : 'bg-slate-950 text-slate-500 border border-slate-800';
        return `<button type="button" onclick="selectEditorDay('${key}')" title="${isOptional ? 'Dia opcional' : ''}" class="py-2 rounded-lg text-[10px] font-black uppercase transition-all ${cor}">${key}${isOptional ? '<span class="block text-[7px] leading-none">opc</span>' : ''}</button>`;
      }).join('');
    }

    function selectEditorDay(key) {
      // salva o nome/foco do dia anterior antes de trocar
      if (getEditorState().currentDay) {
        const prevDay = getEditorState().schedule[getEditorState().currentDay];
        prevDay.name = document.getElementById('editorDayName').value.trim() || prevDay.name;
        prevDay.focus = document.getElementById('editorDayFocus').value.trim();
      }
      getEditorState().currentDay = key;
      const day = getEditorState().schedule[key];
      document.getElementById('editorDayName').value = day.name;
      document.getElementById('editorDayFocus').value = day.focus;
      renderEditorDayTabs();
      renderExerciseEditorRows();
    }

    function moveExerciseRow(idx, delta) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      const destino = idx + delta;
      if (destino < 0 || destino >= day.exercises.length) return;
      const [item] = day.exercises.splice(idx, 1);
      day.exercises.splice(destino, 0, item);
      renderExerciseEditorRows();
    };

    // ---------- DESCANSO POR EXERCICIO ----------
    // Agachamento pede bem mais descanso que rosca direta. Vazio = usa o tempo padrao
    // definido em Perfil > Dados, que continua sendo o comportamento de quem nao mexer aqui.
    // ---------- DIA OPCIONAL ----------
    function toggleEditorDayOptional() {
      const dia = getEditorState().schedule[getEditorState().currentDay];
      dia.optional = !dia.optional;
      renderEditorDayOptional();
      renderEditorDayTabs();
      renderDaysPerWeekWarning();
    };

    function renderEditorDayOptional() {
      const dia = getEditorState().schedule[getEditorState().currentDay];
      const btn = document.getElementById('editorDayOptionalToggle');
      const txt = document.getElementById('editorDayOptionalText');
      if (!btn || !txt) return;

      const on = !!dia.optional;
      const semExercicios = (dia.exercises || []).length === 0;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.className = `relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${on ? 'bg-emerald-600' : 'bg-slate-700'}`;
      btn.innerHTML = `<span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[1.375rem]' : 'left-0.5'}"></span>`;

      txt.textContent = semExercicios
        ? 'Este dia já não tem exercícios, então nunca quebra a sequência.'
        : (on
            ? 'Não fazer este treino não vai quebrar sua sequência.'
            : 'Se você não treinar neste dia, sua sequência será zerada.');
    }

    function updateExerciseRest(idx, value) {
      const day = getEditorState().schedule[getEditorState().currentDay];
      if (!day.exercises[idx]) return;
      const n = parseInt(value, 10);
      if (!value || isNaN(n) || n <= 0) delete day.exercises[idx].restSeconds;
      else day.exercises[idx].restSeconds = Math.min(600, Math.max(5, n));
    };

    function countScheduledTrainingDays(schedule) {
      if (!schedule) return 0;
      return DAY_ORDER.filter(k => schedule[k] && (schedule[k].exercises || []).length > 0).length;
    }

    function renderDaysPerWeekWarning() {
      const box = document.getElementById('dpwMismatchWarning');
      const txt = document.getElementById('dpwMismatchText');
      if (!box || !txt || !getEditorState()) return;

      const informado = Math.min(7, Math.max(1, parseInt(document.getElementById('editorDaysPerWeek').value, 10) || 0));
      const reais = countScheduledTrainingDays(getEditorState().schedule);

      // nada a dizer enquanto o plano estiver vazio ou os números baterem
      if (reais === 0 || !informado || informado === reais) {
        box.classList.add('hidden');
        return;
      }

      txt.innerHTML = informado > reais
        ? `Você marcou <strong>${informado} dias/semana</strong>, mas montou exercícios em apenas <strong>${reais}</strong>. Assim a meta semanal fica inatingível e a Refeição Livre nunca libera.`
        : `Você marcou <strong>${informado} dias/semana</strong>, mas montou exercícios em <strong>${reais}</strong>. Assim cada check-in vale menos XP do que deveria.`;
      document.getElementById('dpwMismatchFix').textContent = `Usar ${reais} dia${reais === 1 ? '' : 's'}/semana`;
      box.classList.remove('hidden');
    }

    function applyDaysPerWeekFromSchedule() {
      const reais = countScheduledTrainingDays(getEditorState().schedule);
      if (!reais) return;
      document.getElementById('editorDaysPerWeek').value = reais;
      getEditorState().daysPerWeek = reais;
      renderDaysPerWeekWarning();
      showToast(`✅ Ajustado para ${reais} dia${reais === 1 ? '' : 's'} por semana.`);
    };
    return { openProfileEditor, closeProfileEditor, renderEditorDayTabs, selectEditorDay, moveExerciseRow, toggleEditorDayOptional, renderEditorDayOptional, updateExerciseRest, countScheduledTrainingDays, renderDaysPerWeekWarning, applyDaysPerWeekFromSchedule };
  }
};
