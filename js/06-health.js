    // ---------- IMC ----------
    function computeIMC(weightKg, heightCm) {
      const h = heightCm / 100;
      if (!weightKg || !h) return null;
      return weightKg / (h * h);
    }

    function classifyIMC(imc) {
      if (imc < 18.5) return { label: 'Abaixo do peso', color: 'blue', pct: (imc / 18.5) * 20, explain: 'Seu IMC está abaixo da faixa considerada saudável. Ganhar peso de forma gradual, com foco em massa muscular, costuma ser o objetivo recomendado nesses casos.' };
      if (imc < 25) return { label: 'Peso normal', color: 'emerald', pct: 20 + ((imc - 18.5) / 6.5) * 30, explain: 'Seu IMC está dentro da faixa considerada saudável para a maioria dos adultos. Manter o hábito de treino e alimentação equilibrada ajuda a sustentar essa faixa.' };
      if (imc < 30) return { label: 'Sobrepeso', color: 'amber', pct: 50 + ((imc - 25) / 5) * 25, explain: 'Seu IMC está na faixa de sobrepeso. Isso não significa necessariamente excesso de gordura — pessoas com bastante massa muscular também caem nessa faixa — mas vale acompanhar a composição corporal junto com o peso.' };
      if (imc < 35) return { label: 'Obesidade grau I', color: 'rose', pct: 75 + ((imc - 30) / 5) * 15, explain: 'Seu IMC está na faixa de obesidade grau I. Combinar treino de força com déficit calórico moderado é uma abordagem eficaz para reduzir essa faixa com o tempo, preservando massa magra.' };
      return { label: 'Obesidade grau II/III', color: 'rose', pct: 95, explain: 'Seu IMC está em uma faixa elevada de obesidade. Recomendamos buscar acompanhamento profissional (médico ou nutricionista) para um plano seguro e individualizado, além do treino.' };
    }

    function computeIdealWeightRange(heightCm) {
      const h = (heightCm || 0) / 100;
      if (!h) return null;
      return { min: (18.5 * h * h).toFixed(1), max: (24.9 * h * h).toFixed(1) };
    }

    // ---------- ÁGUA ----------
    function computeWaterTargetMl(weightKg, activityLevel) {
      if (!weightKg) return 0;
      let base = weightKg * 35;
      if (activityLevel === 'moderado') base += 350;
      else if (activityLevel === 'intenso') base += 700;
      return Math.round(base / 50) * 50;
    }

    window.addWater = function(amount) {
      const today = todayKey();
      waterLog[today] = Math.max(0, (waterLog[today] || 0) + amount);
      saveJSON(WATER_KEY, waterLog);
      checkWaterBonus();
      renderWaterCard();
    };

    function checkWaterBonus() {
      const today = todayKey();
      const target = computeWaterTargetMl(parseFloat(userProfile.weight), userProfile.activityLevel);
      const consumed = waterLog[today] || 0;
      if (target > 0 && consumed >= target && !gamification.waterBonus[today]) {
        gamification.waterBonus[today] = true;
        saveJSON(GAMIFICATION_KEY, gamification);
        const bonus = getWaterBonusXP();
        grantXP(bonus);
        showToast(`💧 Meta de água batida! +${bonus} XP (10% do check-in)`, 'trophy');
        checkAchievements();
      }
    }

    // ---------- RENDER DA VIEW DE PERFIL ----------
    function renderPerfilView() {
      document.getElementById('profileName').value = userProfile.name || '';
      document.getElementById('profileAge').value = userProfile.age || '';
      document.getElementById('profileHeight').value = userProfile.height || '';
      document.getElementById('profileWeight').value = userProfile.weight || '';
      document.getElementById('profileTargetWeight').value = userProfile.targetWeight || '';
      document.getElementById('profileSex').value = userProfile.sex || '';
      document.getElementById('profileActivity').value = userProfile.activityLevel || 'moderado';
      renderIMCCard();
      renderWaterCard();
      renderWeightHistory();
      renderGoalRoadmap();
    }

    function renderIMCCard() {
      const weightNum = parseFloat(userProfile.weight);
      const heightNum = parseFloat(userProfile.height);
      const imc = computeIMC(weightNum, heightNum);
      const imcValueEl = document.getElementById('imcValue');
      const imcClassEl = document.getElementById('imcClass');
      const imcMarker = document.getElementById('imcMarker');
      const imcExplainEl = document.getElementById('imcExplainText');
      if (imc === null || isNaN(imc)) {
        imcValueEl.textContent = '--';
        imcClassEl.textContent = 'Preencha altura e peso';
        imcClassEl.className = 'mt-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-slate-500 bg-slate-800/50';
        imcMarker.style.left = '0%';
        imcExplainEl.textContent = 'Preencha altura e peso para ver sua classificação.';
        return;
      }
      const info = classifyIMC(imc);
      const colorMap = {
        blue: 'text-blue-300 bg-blue-950/40',
        emerald: 'text-emerald-300 bg-emerald-950/40',
        amber: 'text-amber-300 bg-amber-950/40',
        rose: 'text-rose-300 bg-rose-950/40'
      };
      imcValueEl.textContent = imc.toFixed(1);
      imcClassEl.textContent = info.label;
      imcClassEl.className = `mt-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${colorMap[info.color]}`;
      imcMarker.style.left = `${Math.min(97, Math.max(2, info.pct))}%`;

      const ideal = computeIdealWeightRange(heightNum);
      let explainHtml = info.explain;
      if (ideal) {
        explainHtml += ` Para sua altura, a faixa de peso considerada "normal" pelo IMC vai de <span class="text-white font-bold">${ideal.min}kg</span> a <span class="text-white font-bold">${ideal.max}kg</span>.`;
      }
      imcExplainEl.innerHTML = explainHtml;
    }

    function renderWaterCard() {
      const today = todayKey();
      const consumed = waterLog[today] || 0;
      const target = computeWaterTargetMl(parseFloat(userProfile.weight), userProfile.activityLevel);
      document.getElementById('waterValue').innerHTML = `${consumed}<span class="text-sm text-slate-500">ml</span>`;
      document.getElementById('waterRemaining').textContent = target > 0
        ? (consumed >= target ? `meta de ${target}ml batida ✅` : `faltam ${target - consumed}ml (bata a meta: +${getWaterBonusXP()} XP)`)
        : 'preencha seu peso para calcular a meta';
      const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
      document.getElementById('waterBarFill').style.width = `${pct}%`;
      document.getElementById('waterBonusBadge').classList.toggle('hidden', !gamification.waterBonus[today]);
    }

    function renderWeightHistory() {
      const list = document.getElementById('weightHistoryList');
      const entries = [...(userProfile.weightHistory || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
      if (entries.length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-600 text-center py-4">Nenhum registro ainda. Salve seus dados para começar o histórico.</p>`;
        return;
      }
      list.innerHTML = entries.map(e => {
        const [y, m, d] = e.date.split('-');
        return `<div class="flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800/60 text-xs">
          <span class="text-slate-400 font-semibold">${d}/${m}/${y}</span>
          <span class="text-white font-bold">${e.weight}kg</span>
          <span class="text-blue-300 font-bold">IMC ${e.imc.toFixed(1)}</span>
        </div>`;
      }).join('');
    }

    function renderGoalRoadmap() {
      const emptyEl = document.getElementById('goalRoadmapEmpty');
      const contentEl = document.getElementById('goalRoadmapContent');
      const currentWeight = parseFloat(userProfile.weight);
      const targetWeight = parseFloat(userProfile.targetWeight);

      if (!currentWeight || !targetWeight) {
        emptyEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        return;
      }
      emptyEl.classList.add('hidden');
      contentEl.classList.remove('hidden');

      // "início" = primeiro peso já registrado no histórico; se não houver, usa o peso atual
      const sortedHistory = [...(userProfile.weightHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
      const startWeight = sortedHistory.length > 0 ? sortedHistory[0].weight : currentWeight;

      document.getElementById('goalStartWeight').textContent = `${startWeight}kg`;
      document.getElementById('goalCurrentWeight').textContent = `${currentWeight}kg`;
      document.getElementById('goalTargetWeight').textContent = `${targetWeight}kg`;

      const totalDistance = targetWeight - startWeight; // positivo = ganhar peso, negativo = perder peso
      const progressText = document.getElementById('goalRemainingText');
      const percentText = document.getElementById('goalPercentText');
      const fill = document.getElementById('goalProgressFill');

      if (Math.abs(totalDistance) < 0.1) {
        fill.style.width = '100%';
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
        progressText.textContent = '🎉 Você atingiu (ou superou) seu peso alvo!';
      } else {
        progressText.textContent = `Faltam ${remaining.toFixed(1)}kg para ${goalIsLoss ? 'perder' : 'ganhar'} até o objetivo`;
      }
      percentText.textContent = `${pct.toFixed(0)}% do caminho percorrido desde o primeiro registro`;
    }

    function saveProfile() {
      userProfile.name = document.getElementById('profileName').value.trim();
      userProfile.age = document.getElementById('profileAge').value;
      userProfile.height = document.getElementById('profileHeight').value;
      userProfile.weight = document.getElementById('profileWeight').value;
      userProfile.targetWeight = document.getElementById('profileTargetWeight').value;
      userProfile.sex = document.getElementById('profileSex').value;
      userProfile.activityLevel = document.getElementById('profileActivity').value;

      const weightNum = parseFloat(userProfile.weight);
      const heightNum = parseFloat(userProfile.height);
      if (weightNum && heightNum) {
        const imc = computeIMC(weightNum, heightNum);
        const today = todayKey();
        const list = userProfile.weightHistory || [];
        const existingIdx = list.findIndex(e => e.date === today);
        const entry = { date: today, weight: weightNum, imc };
        if (existingIdx >= 0) list[existingIdx] = entry; else list.push(entry);
        userProfile.weightHistory = list;
      }
      saveJSON(PROFILE_KEY, userProfile);
      renderIMCCard();
      renderWaterCard();
      renderWeightHistory();
      renderGoalRoadmap();
      checkWaterBonus();
      checkAchievements();
      showToast('Perfil salvo com sucesso!');
    }
