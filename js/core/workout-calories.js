window.TREINO_WORKOUT_CALORIES = {
  create({
    getSettings, getUserProfile, getEntrySeries, metDoCardio, metDaForca, SEGUNDOS_POR_SERIE
  }) {
    function estimarMinutosDeForca(exercicios) {
      const descanso = getSettings().restSeconds || 90;
      let seg = 0;
      exercicios.forEach(e => {
        if (e.type === 'cardio') return;
        const series = getEntrySeries(e).length || parseInt(e.sets, 10) || 0;
        seg += series * (SEGUNDOS_POR_SERIE + descanso);
      });
      return seg / 60;
    }

    function estimateWorkoutCalories(dia) {
      const peso = parseFloat(getUserProfile().weight);
      if (!peso || !dia || !dia.exercicios || !dia.exercicios.length) return null;

      const cardios = dia.exercicios.filter(e => e.type === 'cardio');
      const minutosCardio = cardios.reduce((t, e) => t + (parseFloat(e.duration) || 0), 0);

      let kcal = 0;
      cardios.forEach(e => {
        const min = parseFloat(e.duration) || 0;
        kcal += metDoCardio(e) * peso * (min / 60);
      });

      // duracao medida inclui o cardio: o que sobra e o tempo de musculacao
      const estimado = estimarMinutosDeForca(dia.exercicios);
      let minutosForca = dia.minutos ? Math.max(0, dia.minutos - minutosCardio) : estimado;
      let medido = !!dia.minutos;

      // O cronometro so comeca a contar quando voce mexe em algum valor. Quem treina e so
      // marca tudo no fim registra 2 minutos para uma hora de treino, e a estimativa sairia
      // ridicula. O tempo calculado pelas series e pelo descanso e um piso fisico — nao da
      // para fazer doze series com noventa segundos de intervalo em dois minutos —, entao
      // uma medicao muito abaixo dele e sinal de que o cronometro perdeu o treino.
      if (medido && estimado > 0 && minutosForca < estimado * 0.5) {
        minutosForca = estimado;
        medido = false;
      }
      const metForca = metDaForca(dia.exercicios, peso, minutosForca);
      kcal += metForca * peso * (minutosForca / 60);

      if (kcal <= 0) return null;
      return { kcal: Math.round(kcal), medido, metForca };
    }


    return { estimarMinutosDeForca, estimateWorkoutCalories };
  }
};
