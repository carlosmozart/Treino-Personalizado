// Gráficos SVG, seleção de pontos e filtros; estado das séries isolado por instância.
window.TREINO_CHARTS = {
  create({ document, getSettings, saveSettings, onRangeChange, positionBubble }) {
    let sparkSeries = {};
    let sparkSeq = 0;

    // options.tips: uma legenda por valor ("12/08/2026 - 82,5kg"). Quando existe, o grafico
    // passa a responder ao toque mostrando o ponto mais proximo.
    function renderSparkline(values, options) {
      const opts = Object.assign({ width: 280, height: 64, color: '#60a5fa', fill: 'rgba(96,165,250,0.14)', tips: null }, options || {});
      const legendas = Array.isArray(opts.tips) ? opts.tips : null;

      // valor e legenda precisam andar juntos: descartar um valor invalido sem descartar a
      // legenda correspondente deslocaria todas as datas seguintes em uma posicao
      const dados = values
        .map((v, i) => ({ v: v, tip: legendas ? legendas[i] : null, trend: opts.trend ? opts.trend[i] : null }))
        .filter(d => typeof d.v === 'number' && isFinite(d.v));
      if (dados.length < 2) return '';

      const w = opts.width, h = opts.height, pad = 6;
      const vals = dados.map(d => d.v);
      const scaleValues = vals.concat(dados.map(d => d.trend).filter(v => typeof v === 'number' && Number.isFinite(v)));
      const hasTarget = typeof opts.target === 'number' && Number.isFinite(opts.target);
      if (hasTarget) scaleValues.push(opts.target);
      const min = Math.min.apply(null, scaleValues);
      const max = Math.max.apply(null, scaleValues);
      const span = (max - min) || 1; // série constante: linha reta no meio, sem divisão por zero
      const targetY = hasTarget ? h - pad - (opts.target - min) / span * (h - pad * 2) : 0;
      const stepX = (w - pad * 2) / (dados.length - 1);

      const coords = dados.map((d, i) => {
        const x = pad + i * stepX;
        const y = h - pad - ((d.v - min) / span) * (h - pad * 2);
        return [x, y];
      });

      const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
      const trendLine = dados.every(d => typeof d.trend === 'number' && Number.isFinite(d.trend))
        ? dados.map((d, i) => `${i ? 'L' : 'M'}${(pad + i * stepX).toFixed(1)},${(h - pad - (d.trend - min) / span * (h - pad * 2)).toFixed(1)}`).join(' ') : '';
      const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;
      // comprimento aproximado do traço, usado pela animação de "desenhar" a linha
      let len = 0;
      for (let i = 1; i < coords.length; i++) {
        len += Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
      }

      // descarta series de graficos que ja nao estao na tela, para o mapa nao crescer a cada
      // vez que a aba e reaberta
      Object.keys(sparkSeries).forEach(k => { if (!document.getElementById(k)) delete sparkSeries[k]; });
      const id = `spark${++sparkSeq}`;
      sparkSeries[id] = { coords: coords, tips: dados.map(d => d.tip), w: w };

      // Os pontos vao como elementos HTML sobre o SVG, e nao como <circle>: o grafico usa
      // preserveAspectRatio="none" para ocupar toda a largura disponivel, o que esticaria
      // qualquer circulo em elipse. Como a altura e fixa, o y ja esta em pixels e o x vira
      // porcentagem — a posicao fica exata em qualquer largura de tela.
      // Com muitos registros as bolinhas ficam a poucos pixels uma da outra e viram uma
      // faixa continua; nesse caso so o ultimo ponto aparece, e os demais surgem ao toque.
      const mostrarTodos = stepX >= 8;
      const bolinhas = coords.map((c, i) => {
        const ultimo = i === coords.length - 1;
        if (!mostrarTodos && !ultimo) return '';
        const tam = ultimo ? 7 : 5;
        return `<span style="position:absolute;left:${(c[0] / w * 100).toFixed(2)}%;top:${c[1].toFixed(1)}px;width:${tam}px;height:${tam}px;margin:${-tam / 2}px 0 0 ${-tam / 2}px;border-radius:50%;background:${opts.color};${ultimo ? '' : 'opacity:.7;'}"></span>`;
      }).join('');

      const grafico = `<div id="${id}"${legendas ? ` onclick="showChartPoint(event,'${id}')" style="position:relative;cursor:pointer"` : ' style="position:relative"'}>
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Gráfico de evolução" style="display:block">
          <path d="${area}" fill="${opts.fill}" stroke="none"/>
          <path d="${line}" fill="none" stroke="${opts.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line" style="--chart-len:${len.toFixed(0)}"/>
          ${trendLine ? `<path data-trend d="${trendLine}" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="5 4"><title>Média móvel de até 7 registros</title></path>` : ''}
          ${hasTarget ? `<line data-target x1="${pad}" x2="${w - pad}" y1="${targetY.toFixed(1)}" y2="${targetY.toFixed(1)}" stroke="#fbbf24" stroke-width="2" stroke-dasharray="2 4"><title>Peso alvo: ${opts.target} kg</title></line>` : ''}
        </svg>
        <div style="position:absolute;top:0;left:0;right:0;height:${h}px;pointer-events:none">
          <span data-guia style="display:none;position:absolute;top:0;height:${h}px;width:1px;background:${opts.color};opacity:.4"></span>
          ${bolinhas}
          <span data-sel style="display:none;position:absolute;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:${opts.color};box-shadow:0 0 0 3px rgba(2,6,23,.95)"></span>
        </div>
      </div>`;

      return grafico;
    }

    // ---------- QUANTOS REGISTROS O GRAFICO MOSTRA ----------
    // Com muitos registros a linha vira um emaranhado e as variacoes recentes — as que
    // interessam para decidir o proximo treino — ficam espremidas em alguns pixels. O
    // seletor deixa escolher entre uma janela curta e o historico inteiro. A escolha fica
    // guardada por grafico, junto das outras preferencias.
    const CHART_RANGES = [5, 7];

    function getChartRange(key) {
      const settings = getSettings();
      const guardado = (settings.chartRange || {})[key];
      return guardado === 5 || guardado === 7 ? guardado : 'tudo';
    }

    function applyChartRange(key, lista) {
      const faixa = getChartRange(key);
      return faixa === 'tudo' ? lista : lista.slice(-faixa);
    }

    // Fica FORA do bloco do grafico de proposito: com uma faixa curta o grafico pode nao ter
    // dados suficientes para ser desenhado, e o controle iria junto — deixando o usuario sem
    // como voltar para "Tudo".
    function chartRangeControls(key, total) {
      const opcoes = CHART_RANGES.filter(n => n < total);
      if (opcoes.length === 0) return '';   // com poucos registros nao ha o que recortar
      const atual = getChartRange(key);
      const botao = (valor, rotulo) => {
        const ativo = String(atual) === String(valor);
        return `<button type="button" onclick="setChartRange('${key}','${valor}')" class="px-2.5 py-1 rounded-lg border text-[10px] font-black transition-all active:scale-95 ${
          ativo ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-500'
        }">${rotulo}</button>`;
      };
      return `<div class="flex items-center justify-end gap-1 mb-2">
        <span class="text-[9px] font-bold text-slate-600 uppercase tracking-wider mr-1">Mostrar</span>
        ${opcoes.map(n => botao(n, `${n}`)).join('')}
        ${botao('tudo', 'Tudo')}
      </div>`;
    }

    function setChartRange(key, valor) {
      const settings = getSettings();
      settings.chartRange = settings.chartRange || {};
      settings.chartRange[key] = valor === 'tudo' ? 'tudo' : parseInt(valor, 10);
      saveSettings();
      onRangeChange(key);
    };

    // Linha de apoio dos graficos consultaveis: sem ela os pontos nao anunciam que respondem
    // ao toque. Fica abaixo das datas, para nao separar o grafico da sua propria legenda.
    function chartHint() {
      return `<p class="text-[9px] text-slate-700 font-bold text-center mt-1">toque no gráfico para ver cada registro</p>`;
    }

    function showChartPoint(ev, id) {
      const serie = sparkSeries[id];
      const box = document.getElementById(id);
      const tip = document.getElementById('nameTooltip');
      if (!serie || !box || !tip) return;
      if (ev.stopPropagation) ev.stopPropagation();   // nao fecha o card nem a bolha junto

      const r = box.getBoundingClientRect();
      if (!r.width) return;
      const fracao = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const alvoX = fracao * serie.w;

      let idx = 0, menor = Infinity;
      serie.coords.forEach((c, i) => {
        const d = Math.abs(c[0] - alvoX);
        if (d < menor) { menor = d; idx = i; }
      });
      const texto = serie.tips[idx];
      if (!texto) return;

      // destaca o ponto escolhido com uma bolinha maior e uma guia vertical: sem isso,
      // com os pontos proximos, nao daria para saber qual deles a bolha esta descrevendo
      const c = serie.coords[idx];
      const pctX = `${(c[0] / serie.w * 100).toFixed(2)}%`;
      const sel = box.querySelector('[data-sel]');
      const guia = box.querySelector('[data-guia]');
      if (sel) { sel.style.left = pctX; sel.style.top = `${c[1].toFixed(1)}px`; sel.style.display = 'block'; }
      if (guia) { guia.style.left = pctX; guia.style.display = 'block'; }

      tip.textContent = texto;
      tip.classList.remove('hidden');

      const dotX = r.left + (c[0] / serie.w) * r.width;
      const dotY = r.top + c[1];
      positionBubble(tip, { left: dotX - 8, right: dotX + 8, top: dotY - 8, bottom: dotY + 8 });
    };
    return { renderSparkline, getChartRange, applyChartRange, chartRangeControls, setChartRange, chartHint, showChartPoint };
  }
};
