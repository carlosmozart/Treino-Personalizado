// Edição de registros e sincronização do último histórico de cada exercício.
window.TREINO_HISTORY_EDITOR = {
  create({ document, getSessionLog, getExerciseHistory, entryDateKey, showToast,
    resolveExerciseName, getEntrySeries, capitalizar, formatDateWithWeekday, escapeHtml,
    saveSessionLog, saveExerciseHistory, refreshHistoryViews, askConfirm, formatDateBR }) {
    let editEntryRef = null;   // { historyKey, date, series[], tipo, cardio{...} }

    function openEditEntry(historyKey, dateStr) {
      const lista = getSessionLog()[historyKey] || [];
      const entry = lista.find(e => entryDateKey(e) === dateStr);
      if (!entry) { showToast('Registro não encontrado.'); return; }

      editEntryRef = {
        historyKey,
        date: dateStr,
        tipo: entry.type === 'cardio' ? 'cardio' : 'forca',
        nome: resolveExerciseName(historyKey, entry),
        series: getEntrySeries(entry).map(sr => ({ reps: sr.reps, weight: sr.weight })),
        duration: entry.duration,
        distance: entry.distance,
        obs: entry.obs || ''
      };

      document.getElementById('editEntryName').textContent = editEntryRef.nome;
      document.getElementById('editEntryDate').textContent = capitalizar(formatDateWithWeekday(dateStr));
      renderEditEntryBody();
      document.getElementById('editEntryOverlay').classList.remove('hidden');
    };

    function renderEditEntryBody() {
      const body = document.getElementById('editEntryBody');
      if (!editEntryRef) return;

      if (editEntryRef.tipo === 'cardio') {
        body.innerHTML = `
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[9px] font-bold text-slate-500 uppercase">Tempo (min)</label>
              <input type="number" inputmode="numeric" id="editEntryDuration" value="${escapeHtml(editEntryRef.duration || 0)}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
            <div>
              <label class="text-[9px] font-bold text-slate-500 uppercase">Distância (km)</label>
              <input type="number" inputmode="decimal" step="0.1" id="editEntryDistance" value="${escapeHtml(editEntryRef.distance || 0)}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-600"/>
            </div>
          </div>`;
        return;
      }

      const linhas = editEntryRef.series.map((sr, i) => `
        <div class="flex items-center gap-2">
          <span class="w-5 text-[10px] font-black text-slate-500 text-center flex-shrink-0">${i + 1}</span>
          <input type="number" inputmode="numeric" value="${sr.reps}" oninput="updateEditSeries(${i},'reps',this.value)" aria-label="Repetições da série ${i + 1}" class="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-600"/>
          <span class="text-[9px] text-slate-600 font-bold flex-shrink-0">reps</span>
          <input type="number" inputmode="decimal" step="0.5" value="${sr.weight}" oninput="updateEditSeries(${i},'weight',this.value)" aria-label="Carga da série ${i + 1}" class="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-600"/>
          <span class="text-[9px] text-slate-600 font-bold flex-shrink-0">kg</span>
          <button type="button" onclick="removeEditSeries(${i})" aria-label="Remover série ${i + 1}" class="w-8 h-9 rounded-lg bg-slate-950/60 border border-slate-700 text-rose-400 active:border-rose-600 flex-shrink-0 text-xs font-black">×</button>
        </div>`).join('');

      const volume = editEntryRef.series.reduce((t, sr) => t + (sr.reps || 0) * (sr.weight || 0), 0);

      body.innerHTML = `
        ${linhas || '<p class="text-xs text-slate-600 text-center py-3">Sem séries. Apague o registro ou adicione uma.</p>'}
        <button type="button" onclick="addEditSeries()" class="w-full bg-slate-950/60 border border-slate-700 active:border-blue-600 text-slate-300 text-[11px] font-black py-2 rounded-xl transition-all active:scale-[0.99] mt-1">+ Adicionar série</button>
        <div class="flex items-center justify-between bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 mt-3">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Volume</span>
          <span class="text-xs font-black text-blue-300">${Math.round(volume).toLocaleString('pt-BR')}kg</span>
        </div>`;
    }

    function updateEditSeries(i, campo, valor) {
      if (!editEntryRef || !editEntryRef.series[i]) return;
      let n = parseFloat(valor) || 0;
      if (n < 0) n = 0;
      editEntryRef.series[i][campo] = campo === 'weight' ? Math.round(n * 10) / 10 : Math.round(n);
      // so o total e redesenhado: refazer as linhas tiraria o foco do campo em edicao
      const volume = editEntryRef.series.reduce((t, sr) => t + (sr.reps || 0) * (sr.weight || 0), 0);
      const el = document.querySelector('#editEntryBody .text-blue-300');
      if (el) el.textContent = `${Math.round(volume).toLocaleString('pt-BR')}kg`;
    };

    function addEditSeries() {
      if (!editEntryRef) return;
      const ultima = editEntryRef.series[editEntryRef.series.length - 1];
      editEntryRef.series.push({ reps: ultima ? ultima.reps : 10, weight: ultima ? ultima.weight : 0 });
      renderEditEntryBody();
    };

    function removeEditSeries(i) {
      if (!editEntryRef) return;
      editEntryRef.series.splice(i, 1);
      renderEditEntryBody();
    };

    function closeEditEntry() {
      editEntryRef = null;
      document.getElementById('editEntryOverlay').classList.add('hidden');
    };

    function saveEditedEntry() {
      if (!editEntryRef) return;
      const { historyKey, date } = editEntryRef;
      const lista = getSessionLog()[historyKey] || [];
      const idx = lista.findIndex(e => entryDateKey(e) === date);
      if (idx < 0) { closeEditEntry(); return; }

      const original = lista[idx];
      if (editEntryRef.tipo === 'cardio') {
        const dur = parseFloat(document.getElementById('editEntryDuration').value) || 0;
        const dist = parseFloat(document.getElementById('editEntryDistance').value) || 0;
        lista[idx] = Object.assign({}, original, { duration: dur, distance: dist });
      } else {
        if (editEntryRef.series.length === 0) { showToast('⚠️ Adicione ao menos uma série ou apague o registro.'); return; }
        const series = editEntryRef.series.map(sr => ({ reps: sr.reps, weight: sr.weight }));
        // corrigir um registro antigo o grava no formato por serie: os valores foram vistos
        // e confirmados pelo usuario, entao aqui a conversao e legitima
        lista[idx] = Object.assign({}, original, {
          series,
          sets: series.length,
          reps: series[0].reps,
          weight: series[0].weight
        });
      }
      getSessionLog()[historyKey] = lista;
      saveSessionLog();
      syncExerciseHistoryFor(historyKey);

      closeEditEntry();
      refreshHistoryViews();
      showToast('✅ Registro corrigido.');
    };

    async function deleteEditedEntry() {
      if (!editEntryRef) return;
      const { historyKey, date, nome } = editEntryRef;
      const ok = await askConfirm({
        icon: '🗑️',
        title: 'Apagar registro',
        text: `Apagar <strong class="text-white">${escapeHtml(nome)}</strong> de ${escapeHtml(formatDateBR(date))}?<br/><span class="text-slate-500">O restante do treino desse dia continua no histórico.</span>`,
        confirmLabel: 'Apagar',
        danger: true
      });
      if (!ok) return;

      getSessionLog()[historyKey] = (getSessionLog()[historyKey] || []).filter(e => entryDateKey(e) !== date);
      if (getSessionLog()[historyKey].length === 0) delete getSessionLog()[historyKey];
      saveSessionLog();
      syncExerciseHistoryFor(historyKey);

      closeEditEntry();
      refreshHistoryViews();
      showToast('🗑️ Registro apagado.');
    };

    // getExerciseHistory() guarda a ultima sessao de cada exercicio e alimenta os badges;
    // depois de mexer no log ele precisa refletir o novo ultimo registro
    function syncExerciseHistoryFor(historyKey) {
      const lista = getSessionLog()[historyKey] || [];
      if (lista.length === 0) delete getExerciseHistory()[historyKey];
      else getExerciseHistory()[historyKey] = lista[lista.length - 1];
      saveExerciseHistory();
    }
    return { openEditEntry, renderEditEntryBody, updateEditSeries, addEditSeries, removeEditSeries, closeEditEntry, saveEditedEntry, deleteEditedEntry, syncExerciseHistoryFor };
  }
};
