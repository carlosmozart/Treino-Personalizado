window.TREINO_SWAP_PICKER = {
  create({ document, getFormData, normalizeExerciseName, getExerciseDef, EXERCISE_LIBRARY,
    escapeJs, escapeHtml, isCardioExerciseName, getHistoryKey, getLastSessionForExercise,
    saveDraftNow, renderExerciseCard, showToast }) {
    // ---------- TROCA AVULSA POR QUALQUER EXERCICIO DA BIBLIOTECA ----------
    // Antes so dava para alternar entre as reservas cadastradas no plano. Sem reserva, a
    // unica saida era ir em Planos > Editar no meio do treino — com o aparelho ocupado e a
    // academia cheia. Aqui a troca vale so para o dia, sem tocar no plano.
    let swapPickerExId = null;

    function openSwapPicker(exId) {
      swapPickerExId = exId;
      const state = getFormData()[exId];
      if (!state) return;
      document.getElementById('swapPickerCurrent').textContent = state.name || 'Exercício';
      const busca = document.getElementById('swapPickerSearch');
      busca.value = '';
      renderSwapPickerList('');
      document.getElementById('swapPickerOverlay').classList.remove('hidden');
      // no celular, abrir o teclado sozinho tampa a lista; deixa o usuario decidir
    }

    function closeSwapPicker() {
      swapPickerExId = null;
      document.getElementById('swapPickerOverlay').classList.add('hidden');
    }

    function renderSwapPickerList(termo) {
      const alvo = normalizeExerciseName(termo || '');
      const lista = document.getElementById('swapPickerList');
      const exDef = swapPickerExId ? getExerciseDef(swapPickerExId) : null;

      // reservas do proprio slot aparecem primeiro: continuam sendo o caminho rapido
      const reservas = ((exDef && exDef.backups) || [])
        .filter(b => b && b.name && b.name.trim())
        .map(b => ({ nome: b.name, grupo: 'Reserva deste exercício', reserva: true }));

      const daBiblioteca = [];
      Object.keys(EXERCISE_LIBRARY).forEach(grupo => {
        EXERCISE_LIBRARY[grupo].forEach(nome => {
          daBiblioteca.push({ nome, grupo, reserva: false });
        });
      });

      const filtrados = reservas.concat(daBiblioteca).filter(item =>
        !alvo || normalizeExerciseName(item.nome).includes(alvo) || normalizeExerciseName(item.grupo).includes(alvo)
      );

      if (filtrados.length === 0) {
        lista.innerHTML = `<p class="text-xs text-slate-600 text-center py-6">Nenhum exercício encontrado.</p>`;
        return;
      }

      lista.innerHTML = filtrados.slice(0, 60).map(item => `
        <button type="button" onclick="applySwapPick('${escapeJs(item.nome)}')" class="w-full text-left bg-slate-950/50 active:bg-slate-800/60 rounded-xl px-3 py-2.5 border ${item.reserva ? 'border-amber-800/50' : 'border-slate-800/60'} transition-all active:scale-[0.99]">
          <p class="text-xs font-bold text-white truncate">${escapeHtml(item.nome)}</p>
          <p class="text-[11px] ${item.reserva ? 'text-amber-400' : 'text-slate-600'} font-bold uppercase tracking-wider">${escapeHtml(item.grupo)}</p>
        </button>`).join('');
    }

    function applySwapPick(nome) {
      const exId = swapPickerExId;
      const state = getFormData()[exId];
      if (!state || !nome) return;

      const exDef = getExerciseDef(exId);
      const reservas = ((exDef && exDef.backups) || []).filter(b => b && b.name && b.name.trim());
      const idxReserva = reservas.findIndex(b => normalizeExerciseName(b.name) === normalizeExerciseName(nome));
      const ehOriginal = exDef && normalizeExerciseName(exDef.name) === normalizeExerciseName(nome);

      const novoTipo = isCardioExerciseName(nome) ? 'cardio' : 'forca';

      if (ehOriginal) {
        state.variantIndex = 0;
        delete state.customName;
      } else if (idxReserva >= 0) {
        state.variantIndex = idxReserva + 1;   // trilha propria da reserva, como antes
        delete state.customName;
      } else {
        // exercicio fora do plano: ganha trilha propria de historico, identificada pelo nome.
        // Como a leitura casa por nome desde a 2.8.0, a evolucao dele continua junta com a
        // dos outros planos onde o mesmo exercicio aparece.
        state.customName = nome;
        state.variantIndex = 0;
      }

      state.name = nome;

      // recupera o que foi feito da ultima vez neste exercicio, venha de onde vier
      const chave = getHistoryKey(exId, state.variantIndex || 0, state.customName);
      const salvo = getLastSessionForExercise(chave, nome);
      if (salvo && salvo.type === novoTipo) {
        if (novoTipo === 'cardio') { state.duration = salvo.duration; state.distance = salvo.distance || 0; }
        else { state.sets = salvo.sets; state.reps = salvo.reps; state.weight = salvo.weight; }
      } else if (novoTipo !== state.type) {
        if (novoTipo === 'cardio') { state.duration = 20; state.distance = 0; }
        else { state.sets = 3; state.reps = 10; state.weight = 0; }
      }
      state.type = novoTipo;
      state.series = [];             // exercicio novo comeca com as series zeradas
      state.swapping = true;

      saveDraftNow();
      closeSwapPicker();
      renderExerciseCard(exId);
      showToast(`🔄 Trocado por ${nome} (só para hoje).`);
    }

    return { openSwapPicker, closeSwapPicker, renderSwapPickerList, applySwapPick };
  }
};
