// Formulário e ações de perfil; acesso ao estado via serviços explícitos.
window.TREINO_PROFILE_ACTIONS = {
  create({ document, getProfile, setProfile, getWaterLog, getSubTab, TMB_FORMULAS, TREINO_PROFILES,
    saveJSON, PROFILE_KEY, WATER_KEY, todayKey, calculateAge, computeIMC, askConfirm, escapeHtml, formatDateBR,
    switchPerfilSubTab, renderIMCCard, renderMetabolismCard, renderTmbFormulaSelector, renderWaterCard,
    renderWeightHistory, renderWeightFreshnessWarning, renderGoalRoadmap, renderRestSettings,
    renderNotificationSettings, renderBackupStatus, renderWeeklyVolume, renderWorkoutHistory,
    checkWaterBonus, checkBirthday, checkAchievements, showToast }) {
    function selectTmbFormula(key) {
      const userProfile = getProfile();
      if (!TMB_FORMULAS[key]) return;
      userProfile.tmbFormula = key;
      saveJSON(PROFILE_KEY, userProfile);
      renderTmbFormulaSelector();
      renderMetabolismCard();
    };

    function addWater(amount) {
      const userProfile = getProfile();
      const today = todayKey();
      const waterLog = getWaterLog();
      waterLog[today] = Math.max(0, (waterLog[today] || 0) + amount);
      saveJSON(WATER_KEY, waterLog);
      checkWaterBonus();
      renderWaterCard();
    };

    function renderPerfilView() {
      const userProfile = getProfile();
      document.getElementById('profileName').value = userProfile.name || '';
      document.getElementById('profileBirthdate').value = userProfile.birthdate || '';
      document.getElementById('profileHeight').value = userProfile.height || '';
      document.getElementById('profileWeight').value = userProfile.weight || '';
      document.getElementById('profileTargetWeight').value = userProfile.targetWeight || '';
      document.getElementById('profileSex').value = userProfile.sex || '';
      document.getElementById('profileActivity').value = userProfile.activityLevel || 'moderado';
      document.getElementById('profileBodyFat').value = userProfile.bodyFatPercent || '';
      const age = calculateAge(userProfile.birthdate);
      document.getElementById('profileAgeDisplay').textContent = age !== null ? `${age} anos` : '';
      switchPerfilSubTab(getSubTab());
      renderIMCCard();
      renderMetabolismCard();
      renderWaterCard();
      renderWeightHistory();
      renderWeightFreshnessWarning();
      renderGoalRoadmap();
      renderRestSettings();
      renderNotificationSettings();
      renderBackupStatus();
      renderWeeklyVolume();
      renderWorkoutHistory();
    }

    async function deleteWeightEntry(dateStr) {
      const userProfile = getProfile();
      const lista = userProfile.weightHistory || [];
      const alvo = lista.find(e => e.date === dateStr);
      if (!alvo) return;
      const ok = await askConfirm({
        icon: '🗑️',
        title: 'Apagar registro de peso',
        text: `Apagar <strong class="text-white">${alvo.weight}kg</strong> de ${escapeHtml(formatDateBR(dateStr))}?`,
        confirmLabel: 'Apagar',
        danger: true
      });
      if (!ok) return;
      userProfile.weightHistory = lista.filter(e => e.date !== dateStr);
      saveJSON(PROFILE_KEY, userProfile);
      renderWeightHistory();
      renderGoalRoadmap();
      showToast('🗑️ Registro de peso apagado.');
    };

    async function startNewWeightGoal() {
      const userProfile = getProfile();
      const startWeight = Number(userProfile.weight);
      const targetWeight = Number(userProfile.targetWeight);
      if (![startWeight, targetWeight].every(n => Number.isFinite(n) && n > 0)) return;
      const confirmed = await askConfirm({ icon: '🎯', title: 'Iniciar nova meta?',
        text: `O progresso passará a usar <strong>${startWeight.toLocaleString('pt-BR')} kg</strong> como início e <strong>${targetWeight.toLocaleString('pt-BR')} kg</strong> como alvo. O histórico de peso será mantido.`,
        confirmLabel: 'Iniciar nova meta' });
      if (!confirmed) return;
      const nextProfile = { ...userProfile, weightGoal: { startWeight, targetWeight, startedAt: todayKey() } };
      if (!saveJSON(PROFILE_KEY, nextProfile)) return;
      setProfile(nextProfile);
      renderGoalRoadmap();
      showToast('Nova meta iniciada. Seu histórico foi preservado.');
    };

    function validateProfileNumbers(fields) {
      for (const [field, id] of Object.entries(fields)) {
        const input = document.getElementById(id);
        const message = input.validity.badInput ? 'Informe um número válido.' : TREINO_PROFILES.numericError(field, input.value);
        if (message) return { input, message };
      }
      return null;
    }

    function saveProfile() {
      const userProfile = getProfile();
      const error = validateProfileNumbers({ height: 'profileHeight', weight: 'profileWeight', targetWeight: 'profileTargetWeight', bodyFatPercent: 'profileBodyFat' });
      const errorEl = document.getElementById('profileValidationError');
      errorEl.classList.toggle('hidden', !error);
      errorEl.textContent = error ? error.message : '';
      if (error) {
        error.input.focus();
        return false;
      }
      const previousTarget = Number(userProfile.targetWeight);
      userProfile.name = document.getElementById('profileName').value.trim();
      userProfile.birthdate = document.getElementById('profileBirthdate').value;
      userProfile.height = document.getElementById('profileHeight').value;
      userProfile.weight = document.getElementById('profileWeight').value;
      userProfile.targetWeight = document.getElementById('profileTargetWeight').value;
      userProfile.sex = document.getElementById('profileSex').value;
      userProfile.activityLevel = document.getElementById('profileActivity').value;
      userProfile.bodyFatPercent = document.getElementById('profileBodyFat').value;

      const weightNum = parseFloat(userProfile.weight);
      const newTarget = Number(userProfile.targetWeight);
      if (newTarget !== previousTarget) {
        if (Number.isFinite(weightNum) && weightNum > 0 && Number.isFinite(newTarget) && newTarget > 0) {
          userProfile.weightGoal = { startWeight: weightNum, targetWeight: newTarget, startedAt: todayKey() };
        } else {
          delete userProfile.weightGoal;
        }
      }
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
      // Datas são registradas ao salvar uma pesagem, nunca por abrir a tela.
      // Não inferir conquistas antigas: um registro diário pode ter sido corrigido.
      if (userProfile.weightGoal && userProfile.weightGoal.targetWeight === newTarget) {
        userProfile.weightGoal = TREINO_PROFILES.recordGoalCheckpoints(userProfile.weightGoal, weightNum, todayKey());
      }
      saveJSON(PROFILE_KEY, userProfile);
      const age = calculateAge(userProfile.birthdate);
      document.getElementById('profileAgeDisplay').textContent = age !== null ? `${age} anos` : '';
      renderIMCCard();
      renderMetabolismCard();
      renderWaterCard();
      renderWeightHistory();
      renderWeightFreshnessWarning();
      renderGoalRoadmap();
      checkWaterBonus();
      checkBirthday();
      checkAchievements();
      showToast('Perfil salvo com sucesso!');
      return true;
    }
    return { selectTmbFormula, addWater, renderPerfilView, deleteWeightEntry, startNewWeightGoal, validateProfileNumbers, saveProfile };
  }
};
