// Calendário mensal do histórico, com navegação limitada ao período registrado.
window.TREINO_WORKOUT_CALENDAR = {
  create({ document, getHistory, DAY_LABELS, todayKey, formatLocalDateKey, escapeHtml,
    now = () => new Date() }) {
    let calendarMonth = null;   // primeiro dia do mes exibido

    function currentMonthStart() {
      const d = now();
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    // Os limites tambem valem aqui, e nao so no estado dos botoes: um botao desabilitado
    // impede o clique, mas nao impede uma segunda chamada ja engatilhada nem qualquer outro
    // caminho que venha a chamar esta funcao. O clamp mora onde o mes muda.
    function calendarBounds() {
      const atual = currentMonthStart();
      const datas = (getHistory() || []).map(d => d.date).sort();
      const primeira = datas.length ? new Date(datas[0] + 'T12:00:00') : atual;
      return { min: new Date(primeira.getFullYear(), primeira.getMonth(), 1), max: atual };
    }

    function changeCalendarMonth(delta) {
      if (!calendarMonth) calendarMonth = currentMonthStart();
      const alvo = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1);
      const lim = calendarBounds();
      if (alvo < lim.min || alvo > lim.max) return;
      calendarMonth = alvo;
      renderWorkoutCalendar();
    };

    function renderWorkoutCalendar() {
      const grid = document.getElementById('calGrid');
      const label = document.getElementById('calMonthLabel');
      if (!grid || !label) return;

      if (!calendarMonth) calendarMonth = currentMonthStart();

      const porDia = {};
      (getHistory() || []).forEach(d => { porDia[d.date] = d; });

      const ano = calendarMonth.getFullYear();
      const mes = calendarMonth.getMonth();
      label.textContent = `${MESES_PT[mes]} ${ano}`;

      // cabecalho comeca na segunda, igual a tirinha de check-in da tela de treino
      const wd = document.getElementById('calWeekdays');
      if (wd && !wd.dataset.pronto) {
        // as tres letras, iguais as da tira de check-in: com uma so, Segunda, Sexta e Sabado
        // virariam todas "S" e Quarta e Quinta virariam "Q"
        wd.innerHTML = DAY_LABELS.map(d => `<span class="text-[10px] font-black text-slate-600 uppercase text-center">${d}</span>`).join('');
        wd.dataset.pronto = '1';
      }

      // limites de navegacao: nao ha o que ver depois do mes atual nem antes do primeiro
      // registro, e botoes que nao levam a lugar nenhum so confundem
      const lim = calendarBounds();
      const podeVoltar = calendarMonth > lim.min;
      const podeAvancar = calendarMonth < lim.max;
      [['calPrev', podeVoltar], ['calNext', podeAvancar]].forEach(par => {
        const b = document.getElementById(par[0]);
        if (!b) return;
        b.disabled = !par[1];
        b.classList.toggle('opacity-40', !par[1]);
      });

      const primeiroDia = new Date(ano, mes, 1);
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();
      // getDay(): 0 = domingo. Como a semana comeca na segunda, domingo vai para a coluna 6.
      const offset = (primeiroDia.getDay() + 6) % 7;
      const hoje = todayKey();

      let html = '';
      for (let i = 0; i < offset; i++) html += '<span></span>';

      let treinosNoMes = 0, volumeNoMes = 0;
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const dateStr = formatLocalDateKey(new Date(ano, mes, dia));
        const registro = porDia[dateStr];
        const isHoje = dateStr === hoje;
        if (registro) { treinosNoMes++; volumeNoMes += registro.volume; }

        if (registro) {
          const soCardio = registro.volume === 0;
          html += `<button type="button" onclick="openWorkoutDay('${dateStr}')" title="${escapeHtml(registro.workoutName)}" class="aspect-square rounded-lg border flex flex-col items-center justify-center transition-all active:scale-90 ${
            soCardio ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-300' : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
          } ${isHoje ? 'border-blue-500' : ''}">
            <span class="text-[11px] font-black leading-none">${dia}</span>
            <span class="text-[9px] font-bold leading-none mt-0.5">${soCardio ? 'cardio' : Math.round(registro.volume / 100) / 10 + 'k'}</span>
          </button>`;
        } else {
          html += `<span class="aspect-square rounded-lg border ${isHoje ? 'border-blue-500' : 'border-slate-800/60'} flex items-center justify-center text-[11px] font-bold ${
            isHoje ? 'text-blue-300' : 'text-slate-700'
          }">${dia}</span>`;
        }
      }
      grid.innerHTML = html;

      const resumo = document.getElementById('calSummary');
      if (resumo) {
        resumo.textContent = treinosNoMes === 0
          ? 'Nenhum treino registrado neste mês.'
          : `${treinosNoMes} treino${treinosNoMes === 1 ? '' : 's'} neste mês` +
            (volumeNoMes > 0 ? ` · ${Math.round(volumeNoMes).toLocaleString('pt-BR')} kg no total` : '');
      }
    }

    const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return { currentMonthStart, calendarBounds, changeCalendarMonth, renderWorkoutCalendar };
  }
};
