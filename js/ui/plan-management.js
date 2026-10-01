// Seleção, listagem, exclusão e cópia de planos; estado lido por callbacks.
window.TREINO_PLAN_MANAGEMENT = {
  create({ document, getProfiles, getGamification, getActiveProfileId, setActiveProfileId,
    TREINO_PROFILES, DAY_ORDER, PROFILES_KEY, ACTIVE_PROFILE_KEY, GAMIFICATION_KEY,
    saveJSON, saveString, renderWorkoutSelectOptions, getTodaysWorkoutKey, workoutSelect,
    initializeWorkoutData, renderHeader, renderExercises, renderCheckinGrid, renderLevelBar,
    syncTrainingReminders, showToast, switchView, checkAchievements, askConfirm, escapeHtml,
    makeId, todayKey }) {
    function selectProfile(profileId) {
      const profiles = getProfiles();
      const gamification = getGamification();
      if (!TREINO_PROFILES.has(profiles, profileId)) return;
      setActiveProfileId(profileId);
      saveString(ACTIVE_PROFILE_KEY, getActiveProfileId());
      gamification.equippedProfiles = gamification.equippedProfiles || {};
      gamification.equippedProfiles[profileId] = true;
      saveJSON(GAMIFICATION_KEY, gamification);
      renderWorkoutSelectOptions();
      const startKey = getTodaysWorkoutKey();
      workoutSelect.value = startKey;
      initializeWorkoutData(startKey);
      renderHeader();
      renderExercises();
      renderCheckinGrid();
      renderLevelBar();
      syncTrainingReminders(false).catch(() => {});
      showToast(`Perfil "${profiles[profileId].name}" selecionado!`);
      switchView('treino');
      checkAchievements();
    }

    async function deleteProfile(profileId) {
      const profiles = getProfiles();
      const gamification = getGamification();
      if (Object.keys(profiles).length <= 1) {
        showToast('⚠️ Não é possível excluir o único perfil existente.');
        return;
      }
      const nome = profiles[profileId].name;
      const diasComExercicio = DAY_ORDER.filter(k => (profiles[profileId].schedule[k].exercises || []).length > 0).length;
      const ok = await askConfirm({
        icon: '🗑️',
        title: 'Excluir perfil',
        text: `Excluir <strong class="text-white">${escapeHtml(nome)}</strong> e os ${diasComExercicio} dias de treino montados nele?<br/><span class="text-rose-300 font-bold">Essa ação não pode ser desfeita.</span><br/><span class="text-slate-500">Seu histórico de sessões e check-ins não é apagado.</span>`,
        confirmLabel: 'Excluir',
        danger: true
      });
      if (!ok) return;
      delete profiles[profileId];
      saveJSON(PROFILES_KEY, profiles);
      if (getActiveProfileId() === profileId) {
        setActiveProfileId(Object.keys(profiles)[0]);
        saveString(ACTIVE_PROFILE_KEY, getActiveProfileId());
        renderWorkoutSelectOptions();
        const startKey = getTodaysWorkoutKey();
        workoutSelect.value = startKey;
        initializeWorkoutData(startKey);
        renderHeader();
        renderExercises();
      }
      renderProfileList();
    }

    // ---------- LISTAGEM DE PERFIS (aba Planos) ----------
    function renderProfileList() {
      const profiles = getProfiles();
      const gamification = getGamification();
      const list = document.getElementById('profileList');
      const ids = Object.keys(profiles);
      list.innerHTML = ids.map(id => {
        const p = profiles[id];
        const isActive = id === getActiveProfileId();
        const totalExercises = DAY_ORDER.reduce((sum, k) => sum + p.schedule[k].exercises.length, 0);
        return `
          <div class="bg-slate-900 rounded-2xl p-4 border ${isActive ? 'border-blue-600' : 'border-slate-800'} shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h4 class="font-extrabold text-white text-sm truncate">${p.name}${isActive ? ' <span class=\"text-[11px] text-blue-400 font-black uppercase align-middle border border-blue-700 rounded-full px-2 py-0.5 ml-1\">Ativo</span>' : ''}</h4>
                <p class="text-xs text-slate-400 mt-1 line-clamp-2">${p.description || 'Sem descrição.'}</p>
                <p class="text-[11px] text-slate-500 mt-2">${p.daysPerWeek} dia${p.daysPerWeek === 1 ? '' : 's'}/semana${p.trainingTime ? ` · ⏰ ${p.trainingTime}` : ''} · ${totalExercises} exercício${totalExercises === 1 ? '' : 's'} cadastrado${totalExercises === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              ${isActive ? '' : `<button type="button" onclick="selectProfile('${id}')" class="flex-1 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/50 text-blue-300 font-bold text-xs py-2 rounded-lg transition-all active:scale-95">Usar Este Perfil</button>`}
              <button type="button" onclick="openProfileEditor('${id}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-lg transition-all active:scale-95">Editar</button>
              <button type="button" onclick="duplicateProfile('${id}')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs px-3 py-2 rounded-lg transition-all active:scale-95">Duplicar</button>
              ${ids.length > 1 ? `<button type="button" onclick="deleteProfile('${id}')" class="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 font-bold text-xs px-3 py-2 rounded-lg transition-all active:scale-95">Excluir</button>` : ''}
            </div>
          </div>`;
      }).join('');
    }

    // ---------- DUPLICAR PLANO ----------
    // Os IDs de exercicio precisam ser REGERADOS. O historico e indexado por esse ID: uma
    // copia que mantivesse os mesmos IDs faria os dois planos gravarem no mesmo lugar,
    // misturando cargas de treinos diferentes.
    async function duplicateProfile(profileId) {
      const profiles = getProfiles();
      const gamification = getGamification();
      const origem = profiles[profileId];
      if (!origem) return;

      const ok = await askConfirm({
        icon: '📋',
        title: 'Duplicar plano',
        text: `Criar uma cópia de <strong class="text-white">${escapeHtml(origem.name)}</strong> com todos os dias e exercícios?<br/><span class="text-slate-500">A cópia começa com histórico próprio, do zero — mas se um exercício tiver o mesmo nome, a evolução dele continua aparecendo.</span>`,
        confirmLabel: 'Duplicar'
      });
      if (!ok) return;

      const novoId = makeId('profile');
      const schedule = {};
      DAY_ORDER.forEach(k => {
        const dia = origem.schedule[k] || { name: '', focus: '', exercises: [] };
        schedule[k] = {
          name: dia.name,
          focus: dia.focus,
          optional: !!dia.optional,   // a marcacao de dia opcional acompanha a copia
          exercises: (dia.exercises || []).map(ex => Object.assign({}, ex, {
            id: makeId('ex'),                                  // ID novo: historico separado
            backups: (ex.backups || []).map(b => Object.assign({}, b))
          }))
        };
      });

      profiles[novoId] = {
        id: novoId,
        name: `${origem.name} (cópia)`,
        description: origem.description || '',
        daysPerWeek: origem.daysPerWeek,
        trainingTime: origem.trainingTime || '',
        schedule,
        createdAt: todayKey(),
        updatedAt: todayKey()
      };
      saveJSON(PROFILES_KEY, profiles);
      renderProfileList();
      showToast('📋 Plano duplicado! Abra para renomear e ajustar.');
    }
    return { selectProfile, deleteProfile, renderProfileList, duplicateProfile };
  }
};
