// Normalização das séries e compatibilidade com históricos/rascunhos antigos.
window.TREINO_SERIES = {
  create({ getEntrySeries }) {
    function buildSeriesFromHistory(ex, saved, qtdAlvo) {
      const total = Math.max(1, parseInt(qtdAlvo, 10) || parseInt(ex.targetSets, 10) || 3);
      const anteriores = saved ? getEntrySeries(saved) : [];
      const out = [];
      for (let i = 0; i < total; i++) {
        const ref = anteriores[i] || anteriores[anteriores.length - 1]; // faltando, repete a ultima
        out.push({
          reps: ref ? ref.reps : (parseFloat(ex.targetReps) || 10),
          weight: ref ? ref.weight : (parseFloat(ex.targetWeight) || 0),
          done: false
        });
      }
      return out;
    }

    function getSeries(state, ex) {
      const total = Math.max(0, parseInt(state.sets, 10) || 0);
      const atual = Array.isArray(state.series) ? state.series : [];
      const out = [];
      for (let i = 0; i < total; i++) {
        const sr = atual[i];
        if (sr) {
          out.push({ reps: sr.reps, weight: sr.weight, done: !!sr.done });
        } else {
          // serie adicionada durante o treino herda a anterior
          const ref = out[out.length - 1] || atual[atual.length - 1];
          out.push({
            reps: ref ? ref.reps : (parseFloat(state.reps) || (ex && ex.targetReps) || 10),
            weight: ref ? ref.weight : (parseFloat(state.weight) || (ex && ex.targetWeight) || 0),
            done: false
          });
        }
      }
      state.series = out;
      return out;
    }

    function syncLegacyFields(state) {
      const series = Array.isArray(state.series) ? state.series : [];
      if (series.length === 0) return;
      state.sets = series.length;
      state.reps = series[0].reps;
      state.weight = series[0].weight;
    }

    function getSeriesDone(state) {
      const series = getSeries(state, null);
      if (Array.isArray(state.seriesDone) && state.seriesDone.length) {
        state.seriesDone.forEach((feita, i) => { if (series[i] && feita) series[i].done = true; });
        delete state.seriesDone;
        state.series = series;
      }
      return series.map(sr => !!sr.done);
    }
    return { buildSeriesFromHistory, getSeries, syncLegacyFields, getSeriesDone };
  }
};
