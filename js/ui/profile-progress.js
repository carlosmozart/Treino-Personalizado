// Renderização do progresso com dependências explícitas e perfil obtido a cada atualização.
window.TREINO_PROFILE_PROGRESS = {
  create({ document, getProfile, TREINO_PROFILES, entryDateKey, compareByDate,
    applyChartRange, chartRangeControls, renderSparkline, formatDateBR, chartHint, escapeJs, escapeHtml }) {
    function renderWeightHistory() {
      const userProfile = getProfile();
      const list = document.getElementById('weightHistoryList');
      const entries = [...(userProfile.weightHistory || [])].filter(e => entryDateKey(e)).sort((a, b) => compareByDate(b, a)).slice(0, 15);
      if (entries.length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-600 text-center py-4">Nenhum registro ainda. Salve seus dados para começar o histórico.</p>`;
        return;
      }
      // gráfico primeiro (ordem cronológica), lista logo abaixo (mais recente no topo).
      // O gráfico usa o histórico completo, não os 15 da lista: "Tudo" precisa querer dizer
      // tudo mesmo para quem já registrou mais que isso.
      const todos = TREINO_PROFILES.weightTrend([...(userProfile.weightHistory || [])].filter(e => entryDateKey(e)).sort(compareByDate));
      const chrono = applyChartRange('peso', todos);
      const target = Number(userProfile.targetWeight);
      const hasTarget = Number.isFinite(target) && target > 0;
      const change = chrono.length > 1 ? Number(chrono[chrono.length - 1].weight) - Number(chrono[0].weight) : 0;
      const chart = chrono.length >= 2
        ? `${chartRangeControls('peso', todos.length)}<div class="bg-slate-950/50 border border-slate-800 rounded-xl p-3 mb-3">
             <p class="text-xs text-slate-300 mb-2">Variação no período: <strong class="text-white">${change > 0 ? '+' : ''}${change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong> · ${chrono.length} registros</p>
             <p id="weightTrendSummary" class="text-sm text-blue-200 mb-2">Média dos últimos ${chrono[chrono.length - 1].trendCount} registros: <strong>${chrono[chrono.length - 1].trend.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></p>
             <p class="text-[10px] text-slate-400 mb-2">Linha verde: peso registrado. Azul tracejado: média móvel de até 7 registros, incluindo anteriores ao recorte. Não é uma média semanal nem uma previsão.</p>
             ${hasTarget ? `<p id="weightTargetLegend" class="text-xs text-amber-300 mb-2">Linha amarela pontilhada: alvo atual de ${target.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg. Referência aplicada a todo o período exibido.</p>` : ''}
             ${renderSparkline(chrono.map(e => e.weight), {
               color: '#34d399', fill: 'rgba(52,211,153,0.14)',
               target: hasTarget ? target : null, height: 100,
               trend: chrono.map(e => e.trend),
               tips: chrono.map(e => `${formatDateBR(e.date)} · ${e.weight}kg · IMC ${Number(e.imc || 0).toFixed(1)}`)
             })}
             <div class="flex justify-between mt-1.5 text-[10px] text-slate-400 font-bold">
               <span>${formatDateBR(chrono[0].date)}</span>
               <span>${formatDateBR(chrono[chrono.length - 1].date)}</span>
             </div>
             ${chartHint()}
           </div>`
        : '';

      list.innerHTML = chart + entries.map(e => {
        const [y, m, d] = e.date.split('-');
        return `<div class="flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800/60 text-xs gap-2">
          <span class="text-slate-400 font-semibold">${d}/${m}/${y}</span>
          <span class="text-white font-bold">${e.weight}kg</span>
          <span class="text-blue-300 font-bold">IMC ${e.imc.toFixed(1)}</span>
          <button type="button" onclick="deleteWeightEntry('${escapeJs(e.date)}')" aria-label="Apagar registro de ${d}/${m}/${y}" class="w-6 h-6 rounded bg-slate-900 border border-slate-700 active:border-rose-600 text-slate-500 active:text-rose-400 flex items-center justify-center flex-shrink-0 text-[10px] font-black">×</button>
        </div>`;
      }).join('');
    }

    function renderWeightFreshnessWarning() {
      const userProfile = getProfile();
      const warning = document.getElementById('weightFreshnessWarning');
      const latest = [...(userProfile.weightHistory || [])].filter(e => entryDateKey(e)).sort(compareByDate).pop();
      if (!latest) return warning.classList.add('hidden');
      const days = Math.floor((Date.now() - new Date(`${entryDateKey(latest)}T12:00:00`).getTime()) / 86400000);
      warning.textContent = `⚠️ Seu último peso foi registrado há ${days} dias. Atualize-o para melhorar as estimativas.`;
      warning.classList.toggle('hidden', days < 90);
    }

    function renderGoalRoadmap() {
      const userProfile = getProfile();
      const emptyEl = document.getElementById('goalRoadmapEmpty');
      const contentEl = document.getElementById('goalRoadmapContent');
      const currentWeight = parseFloat(userProfile.weight);
      const targetWeight = parseFloat(userProfile.targetWeight);

      if (![currentWeight, targetWeight].every(n => Number.isFinite(n) && n > 0)) {
        emptyEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        return;
      }
      emptyEl.classList.add('hidden');
      contentEl.classList.remove('hidden');

      // "início" = primeiro peso já registrado no histórico; se não houver, usa o peso atual
      const sortedHistory = [...(userProfile.weightHistory || [])].filter(e => entryDateKey(e) && Number.isFinite(Number(e.weight)) && Number(e.weight) > 0).sort(compareByDate);
      const savedGoal = userProfile.weightGoal;
      const hasGoal = savedGoal && savedGoal.targetWeight === targetWeight && Number.isFinite(savedGoal.startWeight) && savedGoal.startWeight > 0;
      const startWeight = hasGoal ? savedGoal.startWeight : sortedHistory.length > 0 ? Number(sortedHistory[0].weight) : currentWeight;
      document.getElementById('goalBaselineText').textContent = hasGoal
        ? `Meta iniciada em ${formatDateBR(savedGoal.startedAt)}. Oscilações fazem parte do processo; não há prazo para avançar.`
        : 'Meta anterior: referência no primeiro peso registrado. Inicie uma nova meta para fixar o ponto de partida sem apagar o histórico.';
      const goal = TREINO_PROFILES.goalProgress(startWeight, currentWeight, targetWeight);
      const kg = value => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
      document.getElementById('goalStartWeight').textContent = kg(startWeight);
      document.getElementById('goalCurrentWeight').textContent = kg(currentWeight);
      document.getElementById('goalTargetWeight').textContent = kg(targetWeight);

      const totalDistance = targetWeight - startWeight; // positivo = ganhar peso, negativo = perder peso
      const progressText = document.getElementById('goalRemainingText');
      const percentText = document.getElementById('goalPercentText');
      const fill = document.getElementById('goalProgressFill');
      const bar = document.getElementById('goalProgressBar');
      bar.setAttribute('aria-valuenow', String(Math.floor(goal.percent)));
      bar.setAttribute('aria-valuetext', `${Math.floor(goal.percent)}% da meta; peso atual ${kg(currentWeight)}`);
      const messages = ['O primeiro passo conta. Siga no seu ritmo.', '25% do caminho! Cada hábito consistente faz diferença.', 'Metade do caminho! Reconheça o que você já construiu.', '75% concluídos! Continue com cuidado e constância.', 'Meta alcançada! Celebre sua dedicação e cuide da manutenção.'];
      const checkpoints = goal.checkpoints.map(point => ({ ...point, date: hasGoal && savedGoal.checkpoints ? savedGoal.checkpoints[point.percent] : null }));
      document.getElementById('goalCheckpoints').innerHTML = checkpoints.map(point => `<li class="rounded-xl border p-3 ${point.reached || point.date ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-slate-950/50 border-slate-700'}">
        <p class="text-sm font-black ${point.reached || point.date ? 'text-emerald-300' : 'text-slate-300'}">${point.percent}% <span aria-hidden="true">${point.reached || point.date ? '✓' : '○'}</span></p>
        <p class="text-sm text-white font-bold mt-1">${kg(point.weight)}</p>
        <p class="text-[10px] text-slate-400 mt-1">${point.date ? `Conquistado em ${escapeHtml(formatDateBR(point.date))}${point.reached ? '' : ' · preservado após oscilação'}` : point.reached ? 'Alcançado · data não registrada' : 'A caminho'}</p></li>`).join('');
      const next = goal.checkpoints.find(point => !point.reached);
      document.getElementById('goalEncouragement').textContent = goal.maintenance
        ? 'Seu objetivo está na faixa do peso inicial. Acompanhe os registros com tranquilidade.'
        : messages[Math.min(4, Math.floor((goal.percent + 1e-8) / 25))] + (next ? ` Próximo marco: ${next.percent}% em ${kg(next.weight)}.` : '');

      if (Math.abs(totalDistance) < 0.1) {
        fill.style.width = `${goal.percent}%`;
        progressText.textContent = 'Peso alvo igual ao peso inicial registrado.';
        percentText.textContent = '';
        return;
      }

      const traveled = currentWeight - startWeight;
      let pct = (traveled / totalDistance) * 100;
      pct = Math.max(0, Math.min(100, pct));
      fill.style.width = `${pct.toFixed(0)}%`;

      const remaining = Math.abs(targetWeight - currentWeight);
      const goalIsLoss = totalDistance < 0;
      const reachedOrPassed = goalIsLoss ? currentWeight <= targetWeight : currentWeight >= targetWeight;

      if (reachedOrPassed) {
        progressText.textContent = '🎉 Meta alcançada — o progresso fica limitado a 100%.';
      } else {
        progressText.textContent = `Faltam ${remaining.toFixed(1)}kg para ${goalIsLoss ? 'perder' : 'ganhar'} até o objetivo`;
      }
      percentText.textContent = `${Math.floor(pct)}% do caminho percorrido desde ${hasGoal ? 'o início desta meta' : 'o primeiro registro'}`;
    }
    return { renderWeightHistory, renderWeightFreshnessWarning, renderGoalRoadmap };
  }
};
