// Apresentação dos dados de treino com dependências explícitas.
window.TREINO_WEEKLY_VOLUME = {
  create({ document, buildWorkoutHistory, formatLocalDateKey, getMondayOf, getMondayOfCurrentWeek, applyChartRange, renderSparkline, formatDateBR, chartHint, getChartRange, chartRangeControls }) {
    function buildWeeklyVolume(quantas) {
      const total = Math.max(1, quantas || 8);
      const porDia = buildWorkoutHistory();

      const acumulado = {};   // chave: segunda-feira da semana
      porDia.forEach(dia => {
        const seg = formatLocalDateKey(getMondayOf(dia.date));
        if (!acumulado[seg]) acumulado[seg] = { volume: 0, treinos: 0 };
        acumulado[seg].volume += dia.volume;
        acumulado[seg].treinos += 1;
      });

      const semanas = [];
      const segAtual = getMondayOfCurrentWeek();
      for (let i = total - 1; i >= 0; i--) {
        const d = new Date(segAtual);
        d.setDate(d.getDate() - i * 7);
        const chave = formatLocalDateKey(d);
        const dados = acumulado[chave] || { volume: 0, treinos: 0 };
        const fim = new Date(d); fim.setDate(fim.getDate() + 6);
        semanas.push({
          inicio: chave,
          fim: formatLocalDateKey(fim),
          volume: Math.round(dados.volume),
          treinos: dados.treinos
        });
      }
      return semanas;
    }

    function renderWeeklyVolume() {
      const body = document.getElementById('weeklyVolumeBody');
      if (!body) return;

      const semanas = buildWeeklyVolume(8);
      const atual = semanas[semanas.length - 1];
      const anterior = semanas[semanas.length - 2];

      // sem nenhum treino registrado ainda, o card explica em vez de mostrar zeros
      const temAlgum = semanas.some(w => w.treinos > 0);
      if (!temAlgum) {
        body.innerHTML = `<p class="text-xs text-slate-600 text-center py-6 leading-relaxed">Nenhum treino registrado nas últimas 8 semanas.<br/>Complete um treino para acompanhar seu volume aqui.</p>`;
        return;
      }

      // variacao so faz sentido com uma semana anterior que teve treino
      let variacao = '';
      if (anterior && anterior.volume > 0 && atual.volume > 0) {
        const pct = ((atual.volume - anterior.volume) / anterior.volume) * 100;
        const sobe = pct >= 0;
        const cor = Math.abs(pct) < 1 ? 'text-slate-400' : (sobe ? 'text-emerald-400' : 'text-amber-400');
        const seta = Math.abs(pct) < 1 ? '=' : (sobe ? '▲' : '▼');
        variacao = `<span class="${cor} font-black text-xs">${seta} ${Math.abs(pct).toFixed(0)}%</span>`;
      } else if (anterior && anterior.volume === 0 && atual.volume > 0) {
        // "retomada" so faz sentido se houve treino em alguma semana anterior; na primeira
        // semana de uso nao ha o que retomar, entao nao mostra comparacao nenhuma
        const houveAntes = semanas.slice(0, -1).some(w => w.volume > 0);
        if (houveAntes) variacao = `<span class="text-emerald-400 font-black text-xs">▲ retomada</span>`;
      }

      // grafico so quando ha ao menos duas semanas com treino, para uma pausa nao achatar a curva
      const visiveis = applyChartRange('volume', semanas);
      const comTreino = visiveis.filter(w => w.volume > 0);
      const grafico = comTreino.length >= 2
        ? `<div class="bg-slate-950/50 border border-slate-800 rounded-xl p-3 mb-3">
             ${renderSparkline(visiveis.map(w => w.volume), {
               color: '#a78bfa', fill: 'rgba(167,139,250,0.14)',
               tips: visiveis.map(w => {
                 const periodo = `${formatDateBR(w.inicio).slice(0, 5)} a ${formatDateBR(w.fim).slice(0, 5)}`;
                 return w.treinos > 0
                   ? `${periodo} · ${w.volume.toLocaleString('pt-BR')} kg · ${w.treinos} treino${w.treinos === 1 ? '' : 's'}`
                   : `${periodo} · sem treino`;
               })
             })}
             <div class="flex justify-between mt-1.5 text-[9px] text-slate-600 font-bold">
               <span>${formatDateBR(visiveis[0].inicio).slice(0,5)}</span>
               <span>${visiveis.length} semanas</span>
               <span>${formatDateBR(visiveis[visiveis.length - 1].inicio).slice(0,5)}</span>
             </div>
             ${chartHint()}
           </div>`
        // sem o aviso, escolher uma faixa curta deixaria um controle solto sobre um vazio
        // sem explicacao
        : `<p class="text-[10px] text-slate-600 text-center bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 mb-3 leading-relaxed">Você treinou em menos de duas das últimas ${visiveis.length} semanas.<br/>${
             // "escolha um periodo maior" so faz sentido se houver periodo maior para escolher
             getChartRange('volume') === 'tudo'
               ? 'Complete treinos em pelo menos duas semanas para ver o gráfico.'
               : 'Escolha um período maior para ver o gráfico.'
           }</p>`;

      const fmt = (n) => n > 0 ? n.toLocaleString('pt-BR') : '--';

      body.innerHTML = `
        ${chartRangeControls('volume', semanas.length)}
        ${grafico}
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5">
            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Esta semana</p>
            <p class="text-lg font-black text-white leading-tight">${fmt(atual.volume)}<span class="text-[10px] text-slate-500 ml-0.5">kg</span></p>
            <p class="text-[9px] text-slate-600">${atual.treinos} treino${atual.treinos === 1 ? '' : 's'}</p>
          </div>
          <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5">
            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Semana passada</p>
            <p class="text-lg font-black text-slate-300 leading-tight">${fmt(anterior ? anterior.volume : 0)}<span class="text-[10px] text-slate-500 ml-0.5">kg</span></p>
            <p class="text-[9px] text-slate-600">${anterior ? anterior.treinos : 0} treino${(anterior && anterior.treinos === 1) ? '' : 's'}</p>
          </div>
        </div>
        ${variacao ? `<div class="flex items-center justify-center gap-2 mt-3">${variacao}<span class="text-[10px] text-slate-600">em relação à semana passada</span></div>` : ''}
        ${(atual.treinos === 0)
          ? `<p class="text-[10px] text-slate-600 text-center mt-3">Semana ainda sem treino registrado.</p>`
          : ''}
      `;
    }
    return { buildWeeklyVolume, renderWeeklyVolume };
  }
};
