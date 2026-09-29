window.TREINO_WORKOUT_DURATION = {
  create({ getWorkoutMeta, todayKey, saveJSON, WORKOUT_META_KEY }) {
    // ---------- DURACAO DO TREINO ----------
    // O inicio e marcado na primeira acao real do dia (ajustar um valor, concluir uma serie),
    // nao na abertura do app: abrir para conferir o treino de amanha nao deve iniciar
    // cronometragem. O fim e o momento de finalizar.
    function markWorkoutStart() {
      const hoje = todayKey();
      if (getWorkoutMeta()[hoje] && getWorkoutMeta()[hoje].inicio) return;
      getWorkoutMeta()[hoje] = Object.assign({}, getWorkoutMeta()[hoje], { inicio: new Date().toISOString() });
      saveJSON(WORKOUT_META_KEY, getWorkoutMeta());
    }

    function markWorkoutEnd() {
      const hoje = todayKey();
      const meta = getWorkoutMeta()[hoje];
      if (!meta || !meta.inicio) return null;
      const fim = new Date();
      const minutos = Math.max(1, Math.round((fim - new Date(meta.inicio)) / 60000));
      // um treino nao dura mais que um dia; valores absurdos indicam app aberto esquecido
      getWorkoutMeta()[hoje] = Object.assign({}, meta, {
        fim: fim.toISOString(),
        minutos: minutos > 480 ? null : minutos
      });
      saveJSON(WORKOUT_META_KEY, getWorkoutMeta());
      return getWorkoutMeta()[hoje].minutos;
    }

    function formatDuration(minutos) {
      if (!minutos || minutos <= 0) return '';
      const h = Math.floor(minutos / 60);
      const m = minutos % 60;
      return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
    }

    return { markWorkoutStart, markWorkoutEnd, formatDuration };
  }
};
