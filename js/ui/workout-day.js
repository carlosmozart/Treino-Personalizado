// Detalhes e resumo de um treino registrado.
window.TREINO_WORKOUT_DAY = {
  create({ document, setDayContext, setHistory, buildWorkoutHistory, showToast,
    formatDateWithWeekday, DOW_TO_KEY, DAY_FULL_NAMES, escapeHtml, escapeJs,
    describeEntry, sessionVolume, NOME_DESCONHECIDO, estimateWorkoutCalories,
    formatDuration, copyTextToClipboard, undoWorkoutDay }) {
    function openWorkoutDay(dateStr) {
      setDayContext(dateStr);
      // Reconstroi SEMPRE. Antes so montava quando o cache estava vazio, entao qualquer
      // treino finalizado depois da primeira visita a aba Progresso ficava de fora — e
      // tocar nesse dia no calendario nao abria absolutamente nada. A agregacao leva
      // poucos milissegundos mesmo com anos de historico.
      const history = buildWorkoutHistory();
      setHistory(history);
      const dia = history.find(d => d.date === dateStr);
      if (!dia) {
        showToast('Nenhum exercício registrado neste dia.');
        return;
      }

      document.getElementById('workoutDayDate').textContent = formatDateWithWeekday(dia.date);
      document.getElementById('workoutDayName').textContent = dia.workoutName;

      // Quando o treino registrado nao corresponde ao dia da semana da data — o que acontece
      // ao treinar a rotina de outro dia — o aviso explica a diferenca em vez de deixar a
      // tela parecer errada.
      const aviso = document.getElementById('workoutDayMismatch');
      const chaveDoDia = DOW_TO_KEY[new Date(dia.date + 'T12:00:00').getDay()];
      if (dia.workoutKey && chaveDoDia && dia.workoutKey !== chaveDoDia) {
        aviso.innerHTML = `\u2139\ufe0f Você treinou a rotina de <strong>${escapeHtml(DAY_FULL_NAMES[dia.workoutKey] || dia.workoutKey)}</strong> neste dia.`;
        aviso.classList.remove('hidden');
      } else {
        aviso.classList.add('hidden');
      }

      const forca = dia.exercicios.filter(e => e.type !== 'cardio');
      const cardio = dia.exercicios.filter(e => e.type === 'cardio');

      const linha = (e) => {
        const detalhe = describeEntry(e);
        const vol = e.type === 'cardio' ? '' : `<p class="text-[9px] text-slate-600">${Math.round(sessionVolume(e)).toLocaleString('pt-BR')}kg de volume</p>`;
        const obs = e.obs ? `<p class="text-[10px] text-amber-300/80 mt-1 italic">"${escapeHtml(e.obs)}"</p>` : '';
        return `<div class="bg-slate-950/50 rounded-xl px-3 py-2.5 border border-slate-800/60">
          <div class="flex items-start justify-between gap-2">
            <button type="button" onclick="showNameTooltip(event, '${escapeJs(e.name || NOME_DESCONHECIDO)}')" title="${escapeHtml(e.name || NOME_DESCONHECIDO)}" aria-label="Mostrar nome completo: ${escapeHtml(e.name || NOME_DESCONHECIDO)}" class="text-left text-xs font-bold ${e.name && e.name !== NOME_DESCONHECIDO ? 'text-white' : 'text-slate-500 italic'} min-w-0 flex-1 truncate rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">${escapeHtml(e.name || NOME_DESCONHECIDO)}</button>
            <span class="text-xs font-black text-blue-300 flex-shrink-0">${escapeHtml(detalhe)}</span>
            <button type="button" onclick="openEditEntry('${escapeJs(e.historyKey || '')}','${escapeJs(e.date)}')" aria-label="Corrigir ${escapeHtml(e.name || 'registro')}" class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 active:border-blue-600 text-slate-400 active:text-blue-300 flex items-center justify-center flex-shrink-0 text-[10px]">✏️</button>
          </div>
          ${vol}${obs}
        </div>`;
      };

      const bloco = (titulo, itens) => itens.length === 0 ? '' :
        `<p class="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-4 mb-2">${titulo}</p>
         <div class="space-y-1.5">${itens.map(linha).join('')}</div>`;

      const calorias = estimateWorkoutCalories(dia);
      document.getElementById('workoutDayBody').innerHTML = `
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
            <p class="text-lg font-black text-white">${dia.exercicios.length}</p>
            <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Exercícios</p>
          </div>
          <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
            <p class="text-lg font-black text-white">${dia.volume > 0 ? Math.round(dia.volume).toLocaleString('pt-BR') : '--'}<span class="text-[10px] text-slate-500">${dia.volume > 0 ? 'kg' : ''}</span></p>
            <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Volume total</p>
          </div>
        </div>
        ${(dia.minutos || calorias) ? `<div class="grid grid-cols-${(dia.minutos && calorias) ? '2' : '1'} gap-2 mt-2">
          ${dia.minutos ? `<div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
            <p class="text-lg font-black text-white">${formatDuration(dia.minutos)}</p>
            <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Duração</p>
          </div>` : ''}
          ${calorias ? `<div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
            <p class="text-lg font-black text-amber-300"><span aria-label="aproximadamente">≈</span>${calorias.kcal.toLocaleString('pt-BR')}<span class="text-[10px] text-slate-500 ml-0.5">kcal</span></p>
            <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Estimativa aproximada</p>
          </div>` : ''}
        </div>` : ''}
        ${calorias ? `<p class="text-[9px] text-slate-600 leading-relaxed mt-2 text-justify">Estimativa a partir do seu peso${calorias.medido ? ' e da duração medida' : ', com a duração calculada pelas séries e pelo descanso'}. Serve para comparar seus treinos entre si, não para fechar conta de dieta — a margem de erro para uma pessoa específica é grande.</p>` : ''}
        ${bloco('Força', forca)}
        ${bloco('Cardio', cardio)}
      `;

      // o botão de copiar remonta o mesmo formato de resumo que o app já gera ao finalizar
      document.getElementById('workoutDayCopy').onclick = async () => {
        let txt = `RESUMO DO TREINO | ${dia.workoutName}\nData: ${formatDateWithWeekday(dia.date)}\n---------------------------------------------\n`;
        dia.exercicios.forEach(e => {
          txt += e.type === 'cardio'
            ? `> ${e.name}: ${e.duration}min${e.distance ? ` | ${e.distance}km` : ''}`
            : `> ${e.name}: ${describeEntry(e)}`;
          if (e.obs) txt += ` [Nota: ${e.obs}]`;
          txt += '\n';
        });
        if (dia.volume > 0 || dia.minutos) {
          txt += '---------------------------------------------\n';
          if (dia.volume > 0) txt += `Volume total: ${Math.round(dia.volume).toLocaleString('pt-BR')} kg\n`;
          if (calorias) txt += `Gasto estimado: ~${calorias.kcal.toLocaleString('pt-BR')} kcal\n`;
          if (dia.minutos) txt += `Duração: ${formatDuration(dia.minutos)}\n`;
        }
        const ok = await copyTextToClipboard(txt);
        showToast(ok ? 'Resumo copiado!' : '❌ Não foi possível copiar.');
      };

      document.getElementById('workoutDayUndo').onclick = () => undoWorkoutDay(dia.date);

      document.getElementById('workoutDayOverlay').classList.remove('hidden');
    };

    function closeWorkoutDay() {
      document.getElementById('workoutDayOverlay').classList.add('hidden');
    };
    return { openWorkoutDay, closeWorkoutDay };
  }
};
