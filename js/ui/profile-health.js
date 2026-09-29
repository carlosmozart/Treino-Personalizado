// Cartões de saúde: renderização com estado e cálculos recebidos explicitamente.
window.TREINO_PROFILE_HEALTH = {
  create({ document, getProfile, getWaterLog, getGamification, TMB_FORMULAS,
    calculateAge, computeTDEE, computeIMC, classifyIMC, computeIdealWeightRange, todayKey, computeWaterTargetMl, getWaterBonusXP }) {
    function renderTmbFormulaSelector() {
      const userProfile = getProfile();
      const wrap = document.getElementById('tmbFormulaSelector');
      const selected = userProfile.tmbFormula || 'mifflin';
      wrap.innerHTML = Object.keys(TMB_FORMULAS).map(key => {
        const f = TMB_FORMULAS[key];
        const isActive = key === selected;
        return `
          <button type="button" onclick="selectTmbFormula('${key}')" class="relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all duration-150 active:scale-95 ${
            isActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }">
            ${f.badge ? `<span class="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-full whitespace-nowrap">${f.badge}</span>` : ''}
            <span class="text-[10px] font-black leading-tight">${f.label}</span>
          </button>`;
      }).join('');

      document.getElementById('bodyFatFieldWrap').classList.toggle('hidden', !TMB_FORMULAS[selected].needsBodyFat);
    }

    function renderMetabolismCard() {
      const userProfile = getProfile();
      const weightNum = parseFloat(userProfile.weight);
      const heightNum = parseFloat(userProfile.height);
      const age = calculateAge(userProfile.birthdate);
      const formulaKey = userProfile.tmbFormula || 'mifflin';
      const formula = TMB_FORMULAS[formulaKey];

      renderTmbFormulaSelector();

      const tmb = formula.compute(weightNum, heightNum, age, userProfile.sex, userProfile.bodyFatPercent);
      const tdee = computeTDEE(tmb, userProfile.activityLevel);

      document.getElementById('tmbValue').textContent = tmb ? Math.round(tmb) : '--';
      document.getElementById('tdeeValue').textContent = tdee ? Math.round(tdee) : '--';

      let explainText = formula.explain;
      if (formula.needsBodyFat && tmb === null) {
        explainText += ' ⚠️ Preencha o percentual de gordura corporal acima para calcular pela Katch-McArdle.';
      }
      document.getElementById('tmbExplainText').textContent = explainText;
    }

    function renderIMCCard() {
      const userProfile = getProfile();
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
      const userProfile = getProfile();
      const today = todayKey();
      const waterLog = getWaterLog();
      const gamification = getGamification();
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
    return { renderTmbFormulaSelector, renderMetabolismCard, renderIMCCard, renderWaterCard };
  }
};
