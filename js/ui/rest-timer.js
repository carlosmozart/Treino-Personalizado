window.TREINO_REST_TIMER = {
  create({ document, window, navigator, PLATFORM, getSettings, restTimer, saveSettings, showToast,
    cancelRestBackgroundNotification, scheduleRestBackgroundNotification, renderNotificationSettings,
    setInterval, clearInterval, setTimeout, refreshHistoryOnResume }) {
    // ---------- CRONÔMETRO DE DESCANSO ENTRE SÉRIES ----------
    // O tempo é calculado a partir do horário de término (Date.now()), nunca contando ticks:
    // iOS e Android congelam os timers de JS quando o app vai para segundo plano ou a tela
    // apaga, e uma contagem baseada em ticks ficaria atrasada exatamente quando você precisa dela.

    // No iOS, som só toca se o contexto de áudio for criado/retomado dentro de um gesto real
    // do usuário. Este destravamento roda uma vez, no primeiro toque em qualquer lugar do app.
    let audioCtx = null;
    function unlockAudio() {
      try {
        if (!audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          audioCtx = new Ctx();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
      } catch (e) { /* aparelho sem suporte a áudio: o app segue funcionando sem som */ }
    }
    document.addEventListener('touchend', unlockAudio, { once: true, passive: true });
    document.addEventListener('click', unlockAudio, { once: true });

    function playBeep(times) {
      if (!getSettings().restSound || !audioCtx) return;
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const count = times || 1;
        for (let i = 0; i < count; i++) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const start = audioCtx.currentTime + i * 0.22;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, start);
          // envelope curto: evita o "clique" de corte abrupto no alto-falante
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + 0.2);
        }
      } catch (e) { /* silencioso: som é um extra, não pode quebrar o cronômetro */ }
    }

    function vibrate(pattern) {
      // navigator.vibrate não existe no iOS — o guard evita erro e o cronômetro segue igual
      if (!getSettings().restVibrate) return;
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    }

    function startRestTimer(seconds, exerciseName) {
      unlockAudio(); // veio de um toque do usuário: melhor momento para liberar o áudio no iOS
      cancelRestBackgroundNotification();
      const total = Math.max(5, parseInt(seconds, 10) || getSettings().restSeconds);
      restTimer.total = total;
      restTimer.endsAt = Date.now() + total * 1000;
      restTimer.running = true;
      restTimer.exerciseName = exerciseName || '';

      const el = document.getElementById('restTimerWidget');
      el.classList.remove('hidden', 'timer-finish');
      void el.offsetWidth;
      el.classList.add('timer-pop');

      document.getElementById('restTimerLabel').textContent = exerciseName ? `Descanso · ${exerciseName}` : 'Descanso';

      clearInterval(restTimer.interval);
      restTimer.interval = setInterval(tickRestTimer, 200);
      tickRestTimer();

      // O timer continua funcionando normalmente sem isso, mas no APK o aviso
      // agendado é o que permite ser notificado quando o app fica em segundo plano.
      if (PLATFORM.isNative && !getSettings().restBackgroundNotification && !getSettings().restBackgroundHintShown) {
        getSettings().restBackgroundHintShown = true;
        saveSettings();
        setTimeout(() => showToast('💡 Quer ser avisado fora do app? Ative “Aviso de descanso em segundo plano” em Perfil > Dados.'), 350);
      }
    };

    function remainingRestSeconds() {
      return Math.max(0, Math.ceil((restTimer.endsAt - Date.now()) / 1000));
    }

    function tickRestTimer() {
      if (!restTimer.running) return;
      const remaining = remainingRestSeconds();
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      document.getElementById('restTimerDisplay').textContent = `${mins}:${String(secs).padStart(2, '0')}`;

      // anel de progresso: circunferência de um círculo de raio 26 ≈ 163.4
      const CIRC = 163.4;
      const pct = restTimer.total > 0 ? remaining / restTimer.total : 0;
      const ring = document.getElementById('restTimerRingFill');
      if (ring) {
        ring.style.strokeDasharray = String(CIRC);
        ring.style.strokeDashoffset = String(CIRC * (1 - pct));
        ring.setAttribute('stroke', remaining <= 10 ? '#f59e0b' : '#3b82f6');
      }

      if (remaining <= 0) finishRestTimer();
    }

    function finishRestTimer() {
      clearInterval(restTimer.interval);
      restTimer.running = false;
      cancelRestBackgroundNotification();
      const el = document.getElementById('restTimerWidget');
      el.classList.remove('timer-pop');
      el.classList.add('timer-finish');
      const ring = document.getElementById('restTimerRingFill');
      if (ring) ring.setAttribute('stroke', '#34d399');
      document.getElementById('restTimerDisplay').textContent = '0:00';
      document.getElementById('restTimerLabel').textContent = '⏰ Bora pra próxima série!';
      playBeep(3);
      vibrate([220, 120, 220, 120, 320]);
      setTimeout(() => { if (!restTimer.running) stopRestTimer(); }, 5000);
    }

    function stopRestTimer() {
      clearInterval(restTimer.interval);
      restTimer.running = false;
      cancelRestBackgroundNotification();
      const el = document.getElementById('restTimerWidget');
      el.classList.add('hidden');
      el.classList.remove('timer-pop', 'timer-finish');
    };

    function adjustRestTimer(deltaSeconds) {
      if (!restTimer.running) return;
      restTimer.endsAt += deltaSeconds * 1000;
      restTimer.total = Math.max(5, restTimer.total + deltaSeconds);
      // impede o ajuste negativo de jogar o fim para o passado e encerrar sem querer
      const minEnd = Date.now() + 1000;
      if (restTimer.endsAt < minEnd) restTimer.endsAt = minEnd;
      if (document.hidden) scheduleRestBackgroundNotification().catch(() => {});
      tickRestTimer();
    };

    // Ao voltar do segundo plano, recalcula na hora em vez de esperar o próximo tick —
    // se o tempo acabou enquanto o app estava fechado, avisa imediatamente.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        scheduleRestBackgroundNotification().catch(() => {});
        return;
      }
      cancelRestBackgroundNotification().catch(() => {});
      if (restTimer.running) tickRestTimer();
      // app que fica dias aberto em segundo plano: ao voltar, o que esta na tela pode
      // estar desatualizado
      refreshHistoryOnResume();
    });

    // ---------- CONFIGURAÇÕES DE DESCANSO (aba Perfil > Dados) ----------
    function updateRestSetting(field, value) {
      if (field === 'restSeconds') getSettings().restSeconds = Math.max(5, parseInt(value, 10) || 90);
      else getSettings()[field] = !!value;
      saveSettings();
      renderRestSettings();
    };

    function renderRestSettings() {
      const secondsEl = document.getElementById('restSecondsInput');
      if (secondsEl && document.activeElement !== secondsEl) secondsEl.value = getSettings().restSeconds;

      [['restAutoStartToggle', 'restAutoStart'], ['restSoundToggle', 'restSound'], ['restVibrateToggle', 'restVibrate']].forEach(pair => {
        const el = document.getElementById(pair[0]);
        if (!el) return;
        const on = !!getSettings()[pair[1]];
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        el.className = `relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-700'}`;
        el.innerHTML = `<span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[1.375rem]' : 'left-0.5'}"></span>`;
      });

      // vibração não existe no iOS: mostra o motivo em vez de um botão que não faz nada
      const vibrateRow = document.getElementById('restVibrateRow');
      if (vibrateRow) vibrateRow.classList.toggle('hidden', !PLATFORM.isNative && !navigator.vibrate);
      renderNotificationSettings();
    }

    function toggleRestSetting(field) {
      getSettings()[field] = !getSettings()[field];
      saveSettings();
      renderRestSettings();
      if (field === 'restSound' && getSettings().restSound) { unlockAudio(); playBeep(1); }
      if (field === 'restVibrate' && getSettings().restVibrate) vibrate(80);
    };

    return { startRestTimer, stopRestTimer, adjustRestTimer, updateRestSetting, renderRestSettings, toggleRestSetting, remainingRestSeconds, tickRestTimer };
  }
};
