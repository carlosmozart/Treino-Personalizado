window.TREINO_AI_PLAN_UI = {
  create({ document, getUserProfile, getProfiles, getActiveProfile, DAY_ORDER,
    getLastSessionForExercise, describeEntry, formatDateBR, buildWeeklyVolume,
    calculateAge, computeIMC, classifyIMC, TMB_FORMULAS, computeTDEE,
    copyTextToClipboard, showToast, parsePlanoDaIA, planoParaSchedule, escapeHtml,
    todayKey, makeId, saveJSON, PROFILES_KEY, renderProfileList, checkAchievements }) {
    // ---------- GERADOR DE PROMPT PARA IA ----------
    // O app nao conversa com IA nenhuma. Ele junta o que ja sabe sobre voce num texto e
    // entrega para voce colar onde quiser: sem chave de API, sem servidor, sem custo por
    // usuario, e nenhum dado saindo do aparelho por conta propria — quem cola e voce.
    let aiOptions = { incluirSaude: true, incluirTreino: true };

    const AI_GOALS = {
      hipertrofia:     'ganhar massa muscular (hipertrofia)',
      emagrecimento:   'emagrecer preservando a massa muscular que já tenho',
      recomposicao:    'perder gordura e ganhar músculo ao mesmo tempo',
      forca:           'ganhar força nos principais movimentos',
      condicionamento: 'melhorar meu condicionamento físico geral'
    }
    const AI_ATIVIDADE = { sedentario: 'sedentário', moderado: 'moderado', intenso: 'intenso' };

    function contarDiasComTreino() {
      const perfil = getActiveProfile();
      if (!perfil) return 3;
      const n = DAY_ORDER.filter(k => perfil.schedule[k] && (perfil.schedule[k].exercises || []).length > 0).length;
      return n || 3;
    }

    function openAIPlan() {
      const perfil = getActiveProfile();

      // objetivo sugerido pela distancia ate o peso alvo — e so um ponto de partida, da para trocar
      const peso = parseFloat(getUserProfile().weight);
      const alvo = parseFloat(getUserProfile().targetWeight);
      let sugerido = 'hipertrofia';
      if (peso && alvo) {
        if (alvo < peso - 1) sugerido = 'emagrecimento';
        else if (alvo > peso + 1) sugerido = 'hipertrofia';
        else sugerido = 'recomposicao';
      }

      document.getElementById('aiGoal').value = sugerido;
      document.getElementById('aiDays').value = (perfil && perfil.daysPerWeek) || contarDiasComTreino();
      document.getElementById('aiMinutes').value = '60';
      renderAIToggles();
      renderAIPrompt();
      document.getElementById('aiPlanOverlay').classList.remove('hidden');
    }

    function closeAIPlan() {
      document.getElementById('aiPlanOverlay').classList.add('hidden');
    }

    function toggleAIOption(chave) {
      aiOptions[chave] = !aiOptions[chave];
      renderAIToggles();
      renderAIPrompt();
    }

    function renderAIToggles() {
      [['aiHealthToggle', 'incluirSaude'], ['aiCurrentToggle', 'incluirTreino']].forEach(par => {
        const el = document.getElementById(par[0]);
        if (!el) return;
        const on = !!aiOptions[par[1]];
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        el.className = `relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${on ? 'bg-emerald-600' : 'bg-slate-700'}`;
        el.innerHTML = `<span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[1.375rem]' : 'left-0.5'}"></span>`;
      });
    }

    // O plano atual com as cargas REAIS do historico, nao as metas cadastradas: e a diferenca
    // entre a IA propor a partir do que voce levanta e propor a partir de um numero que voce
    // digitou uma vez e nunca mais.
    function buildCurrentPlanLines() {
      const perfil = getActiveProfile();
      if (!perfil) return [];
      const out = [];
      DAY_ORDER.forEach(chave => {
        const dia = perfil.schedule[chave];
        if (!dia || !(dia.exercises || []).length) return;
        out.push(`${dia.name || chave}${dia.focus ? ` — foco: ${dia.focus}` : ''}`);
        dia.exercises.forEach(ex => {
          if (!ex.name || !ex.name.trim()) return;
          const ultima = getLastSessionForExercise(ex.id, ex.name);
          let detalhe;
          if (ultima) {
            detalhe = `${describeEntry(ultima)} (última vez em ${formatDateBR(ultima.date)})`;
          } else if (ex.type === 'cardio') {
            detalhe = `${ex.targetDuration || 20}min${ex.targetDistance ? ` · ${ex.targetDistance}km` : ''} (ainda não registrado)`;
          } else {
            detalhe = `${ex.targetSets || 3}x${ex.targetReps || 10}${ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''} (ainda não registrado)`;
          }
          out.push(`  - ${ex.name}: ${detalhe}`);
        });
        out.push('');
      });
      while (out.length && out[out.length - 1] === '') out.pop();
      return out;
    }

    function buildVolumeLines() {
      const semanas = buildWeeklyVolume(4).filter(w => w.treinos > 0);
      if (!semanas.length) return [];
      return semanas.map(w =>
        `- ${formatDateBR(w.inicio).slice(0, 5)} a ${formatDateBR(w.fim).slice(0, 5)}: ${w.volume.toLocaleString('pt-BR')} kg levantados em ${w.treinos} ${w.treinos === 1 ? 'treino' : 'treinos'}`);
    }

    function buildAIPrompt() {
      const objetivo = document.getElementById('aiGoal').value;
      const dias = Math.min(7, Math.max(1, parseInt(document.getElementById('aiDays').value, 10) || contarDiasComTreino()));
      const minutos = document.getElementById('aiMinutes').value || '60';
      const notas = (document.getElementById('aiNotes').value || '').trim();
      const L = [];

      L.push('Quero que você monte um plano de treino de musculação para mim.');
      L.push('');

      if (aiOptions.incluirSaude) {
        const idade = calculateAge(getUserProfile().birthdate);
        const peso = parseFloat(getUserProfile().weight);
        const altura = parseFloat(getUserProfile().height);
        const alvo = parseFloat(getUserProfile().targetWeight);
        const imc = computeIMC(peso, altura);
        const d = [];
        if (idade !== null) d.push(`- Idade: ${idade} anos`);
        if (getUserProfile().sex) d.push(`- Sexo: ${getUserProfile().sex}`);
        if (altura) d.push(`- Altura: ${altura} cm`);
        if (peso) d.push(`- Peso atual: ${peso} kg`);
        if (alvo) d.push(`- Peso que quero atingir: ${alvo} kg`);
        if (imc) d.push(`- IMC: ${imc.toFixed(1)} (${classifyIMC(imc).label.toLowerCase()})`);
        if (getUserProfile().bodyFatPercent) d.push(`- Gordura corporal: ${getUserProfile().bodyFatPercent}%`);
        d.push(`- Nível de atividade no dia a dia: ${AI_ATIVIDADE[getUserProfile().activityLevel] || 'moderado'}`);
        const formula = TMB_FORMULAS[getUserProfile().tmbFormula || 'mifflin'];
        const tmb = formula.compute(peso, altura, idade, getUserProfile().sex, getUserProfile().bodyFatPercent);
        const tdee = computeTDEE(tmb, getUserProfile().activityLevel);
        if (tdee) d.push(`- Gasto calórico diário estimado: ${Math.round(tdee)} kcal (metabolismo basal ${Math.round(tmb)} kcal)`);
        if (d.length) { L.push('## SOBRE MIM'); d.forEach(x => L.push(x)); L.push(''); }
      }

      L.push('## MEU OBJETIVO');
      L.push(`Quero ${AI_GOALS[objetivo] || AI_GOALS.hipertrofia}.`);
      L.push('');

      L.push('## MINHA DISPONIBILIDADE');
      L.push(`- ${dias} ${dias === 1 ? 'dia' : 'dias'} de treino por semana`);
      L.push(`- Cerca de ${minutos} minutos por treino`);
      L.push('');

      let temPlanoAtual = false;
      if (aiOptions.incluirTreino) {
        const plano = buildCurrentPlanLines();
        temPlanoAtual = plano.length > 0;
        if (plano.length) {
          L.push('## O QUE EU TREINO HOJE');
          plano.forEach(x => L.push(x));
          L.push('');
          // a frase precisa valer para os dois casos: exercicio com historico e exercicio
          // que ainda nao foi feito. Dizer que tudo ali e carga real seria falso.
          L.push('Onde aparece uma data, essa é a carga que eu realmente usei da última vez. Onde está escrito "ainda não registrado", é a carga que está planejada mas que eu ainda não confirmei na prática.');
          L.push('');
        }
        const volume = buildVolumeLines();
        if (volume.length) {
          L.push('## MEU VOLUME DAS ÚLTIMAS SEMANAS');
          volume.forEach(x => L.push(x));
          L.push('');
        }
      }

      L.push('## OBSERVAÇÕES IMPORTANTES');
      if (notas) {
        L.push(notas);
      } else {
        // A maioria copia sem preencher nada. Sem observacoes a IA nao tem como saber de
        // lesao alguma, e o teste com o Gemini mostrou o resultado: agachamento livre, stiff
        // com barra e avanco com halteres para quem tem o plano real adaptado a joelho e
        // escoliose. Como o campo fica vazio, o prompt pede o cuidado no lugar do usuario.
        L.push('Não informei limitações físicas. Parta do princípio de que você não sabe nada sobre lesões, dores ou restrições que eu possa ter: para todo exercício que exija mais técnica ou que carregue mais a coluna, o joelho ou o ombro, avise e ofereça uma alternativa mais segura.');
      }
      L.push('');

      L.push('## O QUE EU PRECISO QUE VOCÊ FAÇA');
      L.push(`Monte um plano semanal com ${dias} ${dias === 1 ? 'dia' : 'dias'} de treino.`);
      L.push('');
      L.push('Primeiro escreva o plano de forma legível, dia a dia, com:');
      L.push('- o dia da semana, um nome curto para o treino e o foco muscular');
      L.push('- a lista de exercícios, cada um com o número de séries e de repetições');
      L.push('- uma frase explicando por que você dividiu a semana desse jeito');
      L.push('');
      // As regras sao montadas e numeradas conforme o que foi de fato enviado. Mandar
      // "mantenha as cargas que eu ja uso" sem ter mandado o treino atual e uma referencia
      // solta: a IA nao tem a que obedecer, e a instrucao so gera ruido.
      const regras = [];
      if (aiOptions.incluirTreino && temPlanoAtual) {
        regras.push('NÃO invente cargas para os exercícios que eu já faço — mantenha as que eu já venho usando.');
      }
      regras.push('Para exercícios novos, não chute um peso: escreva "definir na prática" e explique em uma linha como eu encontro a carga certa.');
      // sem isso a resposta vem com faixas ("8 a 10") e o app guarda um numero so
      regras.push('Use UM número de repetições por exercício, nunca uma faixa. Em vez de "8 a 10 repetições", escreva 8.');
      // sem isso o tempo informado vira decorativo: o teste veio com 7 exercicios e 23 series
      // para uma sessao de 60 minutos
      regras.push(`Distribua os exercícios para caberem nos ${minutos} minutos que eu tenho: cada série consome cerca de 2 minutos entre execução e descanso, e reserve 10 minutos para aquecimento.`);
      regras.push(notas
        ? 'Respeite as limitações, lesões e equipamentos que eu citei nas observações.'
        : 'Trate as observações acima como parte do pedido: aponte os exercícios mais exigentes e ofereça alternativa para cada um.');
      regras.push('Use os nomes de exercícios como são conhecidos em academia no Brasil.');
      regras.push('Se algum dado meu indicar que eu deveria falar com um médico ou educador físico antes de começar, me diga isso primeiro.');

      L.push('Siga estas regras:');
      regras.forEach((r, i) => L.push(`${i + 1}. ${r}`));
      L.push('');
      // O bloco existe para o app conseguir ler o plano de volta. Sem ele a resposta e prosa
      // livre, e cada detalhe — faixa de repeticoes, "Dia 1" em vez de segunda-feira,
      // exercicio contado em segundos — vira adivinhacao na hora de importar.
      // O bloco precisa vir dentro de um bloco de codigo. Na primeira versao ele saiu como
      // texto comum, e o markdown do chat colapsou todas as quebras de linha (o bloco inteiro
      // virou uma linha so) e ainda comeu parte dos sinais de igual dos delimitadores —
      // ===PLANO=== chegou como =PLANO=, porque === embaixo de um texto e titulo em markdown.
      // Delimitadores entre colchetes sao inertes em markdown.
      L.push('Por último, repita o plano inteiro no formato abaixo, DENTRO de um bloco de código (```), para eu conseguir importar no meu app:');
      L.push('Se você não conseguir seguir esse formato, não invente um bloco incompleto: responda exatamente "NÃO CONSEGUI GERAR BLOCO IMPORTÁVEL: " e explique o motivo em seguida.');
      L.push('');
      L.push('[PLANO]');
      L.push('DIA | SEG | Push A | Peito, Ombros e Tríceps');
      L.push('EX | Supino Reto com Barra | forca | 4 | 8 | | Supino Reto com Halteres');
      L.push('EX | Elevação Lateral com Halteres | forca | 4 | 12 | |');
      L.push('EX | Prancha Abdominal | tempo | 3 | 45 | |');
      L.push('DIA | TER | Pull A | Costas e Bíceps');
      L.push('EX | Puxada Frontal na Polia | forca | 4 | 8 | |');
      L.push('[FIM]');
      L.push('');
      L.push('Regras do bloco:');
      L.push('- Coloque o bloco inteiro dentro de ``` para as quebras de linha não se perderem.');
      L.push('- Uma linha DIA para cada dia de treino, seguida das linhas EX daquele dia.');
      L.push('- Dias de descanso não entram no bloco.');
      L.push('- O dia da semana é uma destas siglas: SEG, TER, QUA, QUI, SEX, SAB, DOM.');
      L.push('- Campos de DIA, nesta ordem: sigla | nome do treino | foco muscular');
      L.push('- Campos de EX, nesta ordem: nome | tipo | séries | repetições | carga | alternativa mais segura');
      L.push('- O tipo é "forca", "tempo" (exercícios contados em segundos, como prancha) ou "cardio" (contados em minutos).');
      L.push('- Nos tipos "tempo" e "cardio", o campo de repetições recebe os segundos ou os minutos.');
      L.push('- A carga vai em kg, ou fica vazia quando for para definir na prática.');
      // sem este campo a informacao mais util da resposta — a alternativa para quem tem
      // limitacao — fica so no texto e some na hora de importar
      L.push('- A alternativa mais segura repete, aqui dentro, a mesma que você citou no plano legível; deixe vazia quando não houver.');
      L.push('- Não use o caractere | dentro dos nomes, e não escreva mais nada dentro do bloco.');

      return L.join('\n');
    }

    function renderAIPrompt() {
      const semNotas = !(document.getElementById('aiNotes').value || '').trim();
      document.getElementById('aiNotesWarning').classList.toggle('hidden', !semNotas);
      const texto = buildAIPrompt();
      document.getElementById('aiPromptOutput').value = texto;
      const linhas = texto.split('\n').length;
      document.getElementById('aiPromptSize').textContent = `${linhas} linhas · ${texto.length} caracteres`;
    }

    async function copyAIPrompt() {
      const ok = await copyTextToClipboard(document.getElementById('aiPromptOutput').value);
      showToast(ok ? '📋 Prompt copiado! Cole na IA da sua preferência.' : '❌ Não foi possível copiar o prompt.');
    }

    // ---------- IMPORTAR O PLANO QUE A IA DEVOLVEU ----------
    // O formato do bloco e as regras deste interpretador saem de respostas reais de tres
    // modelos, nao de suposicao. Cada tolerancia abaixo existe porque uma amostra a exigiu.
    const AI_IMPORT_FORMAT = `[PLANO]
DIA|SEG|Nome do treino|Foco|
EX|Nome do exercício|forca|3|10|20|Alternativa opcional|
[FIM]`;

    let aiImportPendente = null;   // o que sera criado se voce confirmar

    function showAIImportError(texto) {
      const trecho = texto.trim().slice(0, 1200);
      document.getElementById('aiImportErrorSnippet').textContent = trecho || '(nenhum texto recebido)';
      document.getElementById('aiImportError').classList.remove('hidden');
    }

    async function copyAIImportFormat() {
      const ok = await copyTextToClipboard(`Repita apenas o plano neste formato:\n${AI_IMPORT_FORMAT}`);
      showToast(ok ? '📋 Formato copiado! Cole na conversa com a IA.' : '❌ Não foi possível copiar o formato.');
    }

    function readAIPlan() {
      const texto = document.getElementById('aiImportInput').value || '';
      document.getElementById('aiImportError').classList.add('hidden');
      if (!texto.trim()) { showAIImportError(texto); showToast('⚠️ Cole a resposta da IA no campo antes de ler.'); return; }

      const plano = parsePlanoDaIA(texto);
      if (!plano || !plano.dias.length) {
        showAIImportError(texto);
        showToast('❌ Não encontrei o bloco do plano nessa resposta. Peça à IA para repetir o bloco entre [PLANO] e [FIM].');
        return;
      }

      const montado = planoParaSchedule(plano);
      aiImportPendente = montado;

      document.getElementById('aiImportSummary').innerHTML = `
        <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
          <p class="text-lg font-black text-white">${montado.dias}</p>
          <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Dias de treino</p>
        </div>
        <div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-center">
          <p class="text-lg font-black text-white">${montado.totalEx}</p>
          <p class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Exercícios</p>
        </div>`;

      const todasNotas = plano.avisos.concat(montado.notas);
      document.getElementById('aiImportNotes').innerHTML = todasNotas.length
        ? `<div class="bg-amber-950/30 border border-amber-800/40 rounded-xl px-3 py-2.5 space-y-1.5">
             <p class="text-[9px] font-black text-amber-400 uppercase tracking-wider">O que o app adaptou</p>
             ${todasNotas.map(n => `<p class="text-[10px] text-amber-300 leading-relaxed text-justify">• ${escapeHtml(n)}</p>`).join('')}
           </div>`
        : '';

      document.getElementById('aiImportDays').innerHTML = DAY_ORDER
        .filter(k => montado.schedule[k].exercises.length)
        .map(k => {
          const dia = montado.schedule[k];
          const series = dia.exercises.reduce((t, e) => t + (e.type === 'cardio' ? 0 : e.targetSets), 0);
          return `<div class="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-bold text-white truncate">${escapeHtml(dia.name)}</p>
              <span class="text-[9px] font-black text-blue-300 flex-shrink-0">${dia.exercises.length} ex · ${series} séries</span>
            </div>
            ${dia.focus ? `<p class="text-[10px] text-slate-500 truncate">${escapeHtml(dia.focus)}</p>` : ''}
            <div class="mt-1.5 space-y-0.5">
              ${dia.exercises.map(e => `<p class="text-[10px] text-slate-400 truncate">· ${escapeHtml(e.name)} <span class="text-slate-600">${
                e.type === 'cardio' ? `${e.targetDuration}min` : `${e.targetSets}x${e.targetReps}`
              }${e.optional ? ' · opcional' : ''}${e.backups[0].name ? ' · tem reserva' : ''}</span></p>`).join('')}
            </div>
          </div>`;
        }).join('');

      document.getElementById('aiImportName').value = `Plano da IA — ${formatDateBR(todayKey())}`;
      document.getElementById('aiImportOverlay').classList.remove('hidden');
    }

    function closeAIImport() {
      document.getElementById('aiImportOverlay').classList.add('hidden');
      aiImportPendente = null;
    }

    function applyAIPlan() {
      if (!aiImportPendente) return;
      const nome = (document.getElementById('aiImportName').value || '').trim();
      if (!nome) { showToast('⚠️ Dê um nome ao plano antes de criar.'); return; }

      const id = makeId('profile');
      getProfiles()[id] = {
        id,
        name: nome,
        description: 'Plano montado por IA e importado pelo app.',
        daysPerWeek: aiImportPendente.dias,
        trainingTime: '',
        schedule: aiImportPendente.schedule,
        createdAt: todayKey(),
        updatedAt: todayKey()
      };
      if (!saveJSON(PROFILES_KEY, getProfiles())) { showToast('❌ Não foi possível salvar o plano.'); return; }

      closeAIImport();
      closeAIPlan();
      renderProfileList();
      checkAchievements();
      showToast(`✅ "${nome}" criado! Ative na lista quando quiser começar.`);
    }

    return { openAIPlan, closeAIPlan, toggleAIOption, renderAIPrompt, copyAIPrompt, copyAIImportFormat, readAIPlan, closeAIImport, applyAIPlan, buildAIPrompt };
  }
};
