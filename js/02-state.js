    let activeWorkoutKey = 'SEG';
    let formData = {};

    const workoutSelect = document.getElementById('workoutSelect');
    const workoutNameEl = document.getElementById('workoutName');
    const workoutFocusEl = document.getElementById('workoutFocus');
    const exercisesContainer = document.getElementById('exercisesContainer');
    const btnGenerate = document.getElementById('btnGenerate');
    const reportContainer = document.getElementById('reportContainer');
    const reportOutput = document.getElementById('reportOutput');
    const btnCopy = document.getElementById('btnCopy');
    const toast = document.getElementById('toast');
    const checkinGrid = document.getElementById('checkinGrid');
    const streakLabel = document.getElementById('streakLabel');
    const monthlyLabel = document.getElementById('monthlyLabel');
    const navTreino = document.getElementById('navTreino');
    const navPlanos = document.getElementById('navPlanos');
    const navPerfil = document.getElementById('navPerfil');
    const navConquistas = document.getElementById('navConquistas');
    const treinoView = document.getElementById('treinoView');
    const planosView = document.getElementById('planosView');
    const perfilView = document.getElementById('perfilView');
    const conquistasView = document.getElementById('conquistasView');
    const levelLabel = document.getElementById('levelLabel');
    const xpBarFill = document.getElementById('xpBarFill');
    const xpLabel = document.getElementById('xpLabel');

    // ---------- PERSISTÊNCIA (localStorage) ----------
    const HISTORY_KEY = 'treino_exercise_history';
    const CHECKIN_KEY = 'treino_checkins';
    const storageAvailable = (() => {
      try { const t = '__t__'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return true; }
      catch (e) { return false; }
    })();

    function loadJSON(key) {
      if (!storageAvailable) return {};
      try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
    }
    function saveJSON(key, obj) {
      if (!storageAvailable) return;
      try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* storage full ou indisponível */ }
    }

    let exerciseHistory = loadJSON(HISTORY_KEY);
    let checkins = loadJSON(CHECKIN_KEY);

    const GAMIFICATION_KEY = 'treino_gamification';
    const PROFILE_KEY = 'treino_user_profile';
    const WATER_KEY = 'treino_water_log';

    let gamification = Object.assign({ totalXP: 0, checkins: {}, waterBonus: {}, streakBonuses: {}, freeMealRewards: {}, unlockedAchievements: {}, longestStreak: 0 }, loadJSON(GAMIFICATION_KEY));
    let userProfile = Object.assign({ name: '', age: '', height: '', weight: '', targetWeight: '', sex: '', activityLevel: 'moderado', weightHistory: [] }, loadJSON(PROFILE_KEY));
    let waterLog = loadJSON(WATER_KEY);

    // ---------- PERFIS DE TREINO (multi-perfil) ----------
    const PROFILES_KEY = 'treino_profiles';
    const ACTIVE_PROFILE_KEY = 'treino_active_profile_id';
    const DAY_ORDER = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
    const DAY_FULL_NAMES = { SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SAB: 'Sábado', DOM: 'Domingo' };
    const MAX_EXERCISES_PER_DAY = 10;

    // ---------- BASE DE EXERCÍCIOS (para compor perfis de treino) ----------
    const EXERCISE_LIBRARY = {
      'Peito': ['Supino Reto (Barra)', 'Supino Reto (Halteres)', 'Supino Inclinado (Barra)', 'Supino Inclinado (Halteres)', 'Supino Declinado (Máquina)', 'Supino Articulado', 'Crossover (Polia Alta)', 'Crossover (Polia Baixa)', 'Peck Deck (Voador)', 'Flexão de Braço (Solo)', 'Paralelas / Mergulho (Dips)', 'Crucifixo com Halteres'],
      'Costas': ['Puxada Frontal (Polia)', 'Puxada Triângulo', 'Barra Fixa (Pull-up)', 'Remada Baixa (Polia)', 'Remada Curvada (Barra)', 'Remada Cavalinho', 'Remada Unilateral (Halter)', 'Remada Máquina', 'Pulldown (Corda)', 'Levantamento Terra', 'Pullover'],
      'Ombro': ['Desenvolvimento Militar (Barra)', 'Desenvolvimento com Halteres', 'Desenvolvimento Máquina', 'Elevação Lateral (Halteres)', 'Elevação Lateral (Polia)', 'Elevação Frontal', 'Crucifixo Invertido (Máquina)', 'Face Pull', 'Encolhimento (Trapézio)'],
      'Bíceps': ['Rosca Direta (Barra)', 'Rosca Direta (Polia)', 'Rosca Alternada (Halteres)', 'Rosca Martelo', 'Rosca Scott (Barra W)', 'Rosca Scott Máquina', 'Rosca Concentrada', 'Rosca 21'],
      'Tríceps': ['Tríceps Pulley (Corda)', 'Tríceps Pulley (Barra)', 'Tríceps Testa (Barra/Halteres)', 'Tríceps Francês', 'Mergulho no Banco', 'Tríceps Coice (Halter)', 'Supino Fechado'],
      'Pernas (Quadríceps)': ['Agachamento Livre', 'Leg Press 45º', 'Cadeira Extensora', 'Agachamento Smith', 'Afundo (Passada)', 'Agachamento Búlgaro', 'Hack Squat'],
      'Pernas (Posterior/Glúteo)': ['Stiff (Halteres/Barra)', 'Levantamento Terra Romeno', 'Mesa Flexora', 'Cadeira Flexora', 'Elevação Pélvica (Hip Thrust)', 'Cadeira Abdutora', 'Cadeira Adutora', 'Glúteo na Polia (Coice)'],
      'Panturrilha': ['Panturrilha em Pé', 'Panturrilha Sentado', 'Panturrilha no Leg Press'],
      'Abdômen / Core': ['Abdominal Crunch (Máquina)', 'Abdominal na Polia', 'Prancha Isométrica', 'Elevação de Pernas', 'Abdominal Infra', 'Rotação de Tronco (Máquina)', 'Roda Abdominal'],
      'Cardio': ['Esteira', 'Bicicleta Ergométrica', 'Elíptico', 'Escada (StairMaster)', 'Remo (Máquina)']
    };

    function isCardioExerciseName(name) {
      return EXERCISE_LIBRARY['Cardio'].includes(name);
    }

    function loadString(key) {
      if (!storageAvailable) return null;
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function saveString(key, value) {
      if (!storageAvailable) return;
      try { localStorage.setItem(key, value); } catch (e) { /* indisponível */ }
    }

    function makeId(prefix) {
      return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }

    function buildEmptySchedule() {
      const schedule = {};
      DAY_ORDER.forEach(key => {
        schedule[key] = { name: `${DAY_FULL_NAMES[key]}: Descanso`, focus: '', exercises: [] };
      });
      return schedule;
    }

    let profiles = loadJSON(PROFILES_KEY);
    let activeProfileId = loadString(ACTIVE_PROFILE_KEY);

    function ensureProfilesSeeded() {
      if (Object.keys(profiles).length === 0) {
        const id = 'default';
        profiles[id] = {
          id,
          name: 'PPL Hipertrofia e Emagrecimento',
          description: 'Plano original: Push/Pull/Legs 2x por semana, adaptado a escoliose e joelho, com ênfase em peitoral inferior.',
          daysPerWeek: 6,
          schedule: SEED_WORKOUT_DATABASE,
          createdAt: todayKey(),
          updatedAt: todayKey()
        };
        saveJSON(PROFILES_KEY, profiles);
      }
      if (!activeProfileId || !profiles[activeProfileId]) {
        activeProfileId = Object.keys(profiles)[0];
        saveString(ACTIVE_PROFILE_KEY, activeProfileId);
      }
    }

    function getActiveProfile() {
      return profiles[activeProfileId];
    }

    function selectProfile(profileId) {
      if (!profiles[profileId]) return;
      activeProfileId = profileId;
      saveString(ACTIVE_PROFILE_KEY, activeProfileId);
      renderWorkoutSelectOptions();
      const startKey = getTodaysWorkoutKey();
      workoutSelect.value = startKey;
      initializeWorkoutData(startKey);
      renderHeader();
      renderExercises();
      renderCheckinGrid();
      renderLevelBar();
      showToast(`Perfil "${profiles[profileId].name}" selecionado!`);
      switchView('treino');
    }

    function deleteProfile(profileId) {
      if (Object.keys(profiles).length <= 1) {
        showToast('⚠️ Não é possível excluir o único perfil existente.');
        return;
      }
      if (!confirm(`Excluir o perfil "${profiles[profileId].name}"? Essa ação não pode ser desfeita.`)) return;
      delete profiles[profileId];
      saveJSON(PROFILES_KEY, profiles);
      if (activeProfileId === profileId) {
        activeProfileId = Object.keys(profiles)[0];
        saveString(ACTIVE_PROFILE_KEY, activeProfileId);
        renderWorkoutSelectOptions();
        const startKey = getTodaysWorkoutKey();
        workoutSelect.value = startKey;
        initializeWorkoutData(startKey);
        renderHeader();
        renderExercises();
      }
      renderProfileList();
    }
