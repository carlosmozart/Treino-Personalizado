// Cálculos puros de saúde e catálogo de fórmulas, sem estado ou acesso à interface.
window.TREINO_HEALTH = (() => {
    const ACTIVITY_MULTIPLIERS = { sedentario: 1.2, moderado: 1.55, intenso: 1.725 };

    function computeTMB_Mifflin(weightKg, heightCm, age, sex) {
      if (!weightKg || !heightCm || age === null || age === undefined || isNaN(age)) return null;
      const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
      if (sex === 'masculino') return base + 5;
      if (sex === 'feminino') return base - 161;
      return base + (5 + -161) / 2; // sexo não informado: média das duas constantes (aproximação)
    }

    function computeTMB_HarrisBenedict(weightKg, heightCm, age, sex) {
      if (!weightKg || !heightCm || age === null || age === undefined || isNaN(age)) return null;
      // Fórmula revisada (Roza & Shizgal, 1984) — mais precisa que a original de 1919
      const male = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
      const female = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age;
      if (sex === 'masculino') return male;
      if (sex === 'feminino') return female;
      return (male + female) / 2;
    }

    function computeTMB_KatchMcArdle(weightKg, bodyFatPercent) {
      if (!weightKg || bodyFatPercent === null || bodyFatPercent === undefined || bodyFatPercent === '' || isNaN(bodyFatPercent)) return null;
      const bf = parseFloat(bodyFatPercent);
      if (bf < 0 || bf > 70) return null; // faixa fisiologicamente plausível
      const leanMass = weightKg * (1 - bf / 100);
      return 370 + 21.6 * leanMass;
    }

    const TMB_FORMULAS = {
      mifflin: {
        label: 'Mifflin-St Jeor',
        badge: 'Recomendada',
        needsBodyFat: false,
        compute: (w, h, a, sex, bf) => computeTMB_Mifflin(w, h, a, sex),
        explain: 'A Mifflin-St Jeor (1990) é considerada pela maioria dos estudos comparativos atuais a fórmula mais precisa para a população em geral, incluindo pessoas com sobrepeso ou obesidade, por isso é a opção padrão aqui. Ela usa peso, altura, idade e sexo, sem precisar saber o percentual de gordura corporal.'
      },
      harris: {
        label: 'Harris-Benedict',
        badge: null,
        needsBodyFat: false,
        compute: (w, h, a, sex, bf) => computeTMB_HarrisBenedict(w, h, a, sex),
        explain: 'A Harris-Benedict, na versão revisada de 1984, foi por décadas o padrão de referência em nutrição clínica. Usa os mesmos dados que a Mifflin (peso, altura, idade e sexo), mas tende a superestimar levemente a taxa metabólica em pessoas com mais gordura corporal, já que não diferencia massa magra de massa gorda.'
      },
      katch: {
        label: 'Katch-McArdle',
        badge: null,
        needsBodyFat: true,
        compute: (w, h, a, sex, bf) => computeTMB_KatchMcArdle(w, bf),
        explain: 'A Katch-McArdle calcula a taxa metabólica a partir da sua massa magra (peso menos a gordura corporal), em vez do peso total. Para quem treina musculação e tem uma proporção de massa muscular acima da média, essa costuma ser a fórmula mais precisa de todas — mas só funciona se você souber (ou estimar bem) seu percentual de gordura corporal.'
      }
    };

    function computeTDEE(tmb, activityLevel) {
      if (tmb === null || tmb === undefined) return null;
      return tmb * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2);
    }

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
    return { TMB_FORMULAS, computeTMB_Mifflin, computeTMB_HarrisBenedict, computeTMB_KatchMcArdle, computeTDEE, computeIMC, classifyIMC, computeIdealWeightRange, computeWaterTargetMl };
})();
