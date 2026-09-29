window.TREINO_HISTORY_QUERIES = {
  create({
    getSessionLog, getExerciseHistory, getProfiles, getActiveProfile, compareByDate, DAY_ORDER,
    DAY_FULL_NAMES
  }) {
    const NOME_DESCONHECIDO = 'Exercício sem nome';
    function normalizeExerciseName(name) {
      return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // ignora acentos na comparacao
        .replace(/\s+/g, ' ');
    }

    function collectSessionsForExercise(historyKey, name) {
      const proprias = getSessionLog()[historyKey] || [];
      const alvo = normalizeExerciseName(name);
      if (!alvo) return { sessions: proprias.slice(), fromOtherProfiles: false };

      let outras = [];
      Object.keys(getSessionLog()).forEach(key => {
        if (key === historyKey) return;
        (getSessionLog()[key] || []).forEach(entry => {
          if (normalizeExerciseName(entry.name) === alvo) outras.push(entry);
        });
      });

      if (outras.length === 0) return { sessions: proprias.slice(), fromOtherProfiles: false };

      // um registro por dia: se o mesmo exercício foi feito em dois perfis no mesmo dia,
      // mantém o de maior carga, que é o que interessa para progressão e recorde
      const porData = {};
      proprias.concat(outras).forEach(e => {
        const atual = porData[e.date];
        if (!atual) { porData[e.date] = e; return; }
        const a = parseFloat(e.weight) || parseFloat(e.duration) || 0;
        const b = parseFloat(atual.weight) || parseFloat(atual.duration) || 0;
        if (a > b) porData[e.date] = e;
      });

      const sessions = Object.values(porData).sort(compareByDate);
      return { sessions, fromOtherProfiles: sessions.length > proprias.length };
    }

    function getLastSessionForExercise(historyKey, name) {
      if (getExerciseHistory()[historyKey]) return getExerciseHistory()[historyKey];
      const { sessions } = collectSessionsForExercise(historyKey, name);
      return sessions.length ? sessions[sessions.length - 1] : null;
    }

    function resolveWorkoutName(workoutKey, dateStr) {
      const profile = getActiveProfile();
      if (workoutKey && profile && profile.schedule[workoutKey]) {
        return profile.schedule[workoutKey].name;
      }
      if (workoutKey && DAY_FULL_NAMES[workoutKey]) return DAY_FULL_NAMES[workoutKey];
      if (dateStr) {
        // meio-dia evita que o fuso empurre a data para o dia anterior
        const d = new Date(dateStr + 'T12:00:00');
        const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return nomes[d.getDay()] || 'Treino';
      }
      return 'Treino';
    }

    function resolveExerciseName(historyKey, entry) {
      if (entry && entry.name && String(entry.name).trim()) return entry.name;
      if (!historyKey) return NOME_DESCONHECIDO;

      const partes = String(historyKey).split('__v');
      const exId = partes[0];
      const variante = partes[1] ? parseInt(partes[1], 10) : 0;

      // procura em todos os planos, nao so no ativo: o registro pode ser de outro perfil
      for (const pid of Object.keys(getProfiles())) {
        const sched = getProfiles()[pid] && getProfiles()[pid].schedule;
        if (!sched) continue;
        for (const k of DAY_ORDER) {
          const lista = (sched[k] && sched[k].exercises) || [];
          const ex = lista.find(e => e.id === exId);
          if (!ex) continue;
          if (variante > 0) {
            const reservas = (ex.backups || []).filter(b => b && b.name && b.name.trim());
            const b = reservas[variante - 1];
            if (b && b.name) return b.name;
          }
          if (ex.name && ex.name.trim()) return ex.name;
        }
      }
      return NOME_DESCONHECIDO;
    }


    return { normalizeExerciseName, collectSessionsForExercise, getLastSessionForExercise, resolveWorkoutName, resolveExerciseName };
  }
};
