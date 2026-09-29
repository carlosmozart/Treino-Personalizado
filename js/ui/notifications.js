window.TREINO_NOTIFICATIONS = {
  create({ document, PLATFORM, DAY_ORDER, localNotifications, getSettings, restTimer, getActiveProfile, saveSettings, showToast }) {
    // ---------- NOTIFICAÇÕES LOCAIS (ANDROID) ----------
    // O plugin agenda no sistema operacional; por isso o lembrete não depende do JavaScript
    // continuar ativo quando o WebView estiver fechado. Na versão web os controles continuam
    // visíveis, mas explicam que esse recurso pertence ao APK.
    const TRAINING_NOTIFICATION_IDS = DAY_ORDER.reduce((ids, day, index) => {
      ids[day] = 4100 + index;
      return ids;
    }, {});
    const REST_NOTIFICATION_ID = 4199;

    function parseTrainingTime(value) {
      const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : null;
    }

    async function ensureNotificationPermission() {
      const plugin = localNotifications();
      if (!plugin) return { display: 'denied', unavailable: true };
      let permission = await plugin.checkPermissions();
      if (permission.display !== 'granted') permission = await plugin.requestPermissions();
      return permission;
    }

    async function ensureExactRestAlarmPermission(plugin) {
      // Android 12+ deixa essa autorização nas configurações do sistema. Em versões
      // anteriores o plugin retorna "granted" sem abrir nenhuma tela.
      if (!plugin || typeof plugin.checkExactNotificationSetting !== 'function') return false;
      let permission = await plugin.checkExactNotificationSetting();
      if (permission.exact_alarm === 'granted') return true;
      if (typeof plugin.changeExactNotificationSetting === 'function') {
        await plugin.changeExactNotificationSetting();
        permission = await plugin.checkExactNotificationSetting();
      }
      return permission.exact_alarm === 'granted';
    }

    async function cancelTrainingReminders() {
      const plugin = localNotifications();
      if (!plugin) return;
      await plugin.cancel({ notifications: DAY_ORDER.map(day => ({ id: TRAINING_NOTIFICATION_IDS[day] })) });
    }

    // O ID versionado é intencional: o Android mantém a configuração do canal
    // depois de criado e não aplica mudanças de som/vibração ao canal antigo.
    const NOTIFICATION_CHANNEL_ID = 'treino-avisos-v2';
    // Criado nativamente com uso de alarme: o volume segue "Alarmes" do Android,
    // não o volume de mídia que pode estar sendo usado pela música.
    const REST_NOTIFICATION_CHANNEL_ID = 'treino-descanso-v3';

    function restNotificationChannelId() {
      // Android mantém som/vibração no canal, não nas opções de cada aviso.
      if (getSettings().restSound && getSettings().restVibrate) return REST_NOTIFICATION_CHANNEL_ID;
      return REST_NOTIFICATION_CHANNEL_ID + (getSettings().restSound ? '-sound' : getSettings().restVibrate ? '-vibrate' : '-silent');
    }

    async function ensureNotificationChannel(plugin) {
      await plugin.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Avisos de treino',
        description: 'Horários de treino e fim dos descansos',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true
      });
    }

    async function syncTrainingReminders(requestPermission) {
      const plugin = localNotifications();
      if (!plugin || !getSettings().trainingReminders) return;
      const profile = getActiveProfile();
      const time = parseTrainingTime(profile && profile.trainingTime);
      if (!time) {
        getSettings().trainingReminders = false;
        saveSettings();
        renderNotificationSettings();
        showToast('⚠️ Defina o horário do treino no plano para ativar lembretes.');
        return;
      }

      const permission = requestPermission
        ? await ensureNotificationPermission()
        : await plugin.checkPermissions();
      if (permission.display !== 'granted') {
        getSettings().trainingReminders = false;
        saveSettings();
        renderNotificationSettings();
        if (requestPermission) showToast('🔕 Permissão de notificações não concedida.');
        return;
      }

      await cancelTrainingReminders();
      const notifications = DAY_ORDER
        .filter(day => {
          const workoutDay = profile && profile.schedule && profile.schedule[day];
          return workoutDay && !workoutDay.optional && (workoutDay.exercises || []).some(ex => ex && ex.name && ex.name.trim());
        })
        .map(day => {
          const workoutDay = profile.schedule[day];
          return {
            id: TRAINING_NOTIFICATION_IDS[day],
            title: 'Hora do treino 💪',
            body: workoutDay.name ? `Hoje: ${workoutDay.name}` : 'Seu treino está pronto para começar.',
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'default',
            vibrate: true,
            extra: { targetView: 'treino', type: 'training-reminder' },
            // Weekday do Capacitor começa no domingo (1); SEG é segunda-feira (2).
            schedule: { on: { weekday: (DAY_ORDER.indexOf(day) + 1) % 7 + 1, hour: time.hour, minute: time.minute }, allowWhileIdle: true },
            isExactNotification: false
          };
        });
      if (!notifications.length) return;
      await ensureNotificationChannel(plugin);
      await plugin.schedule({ notifications });
    }

    async function scheduleRestBackgroundNotification() {
      const plugin = localNotifications();
      if (!plugin || !getSettings().restBackgroundNotification || !restTimer.running) return;
      const permission = await plugin.checkPermissions();
      if (permission.display !== 'granted') return;
      const at = new Date(restTimer.endsAt);
      if (at <= new Date()) return;
      await ensureNotificationChannel(plugin);
      await plugin.schedule({ notifications: [{
        id: REST_NOTIFICATION_ID,
        title: 'Descanso concluído ⏰',
        body: restTimer.exerciseName ? `Volte para ${restTimer.exerciseName}.` : 'Bora para a próxima série!',
        channelId: restNotificationChannelId(),
        sound: getSettings().restSound ? 'default' : undefined,
        vibrate: !!getSettings().restVibrate,
        extra: { targetView: 'treino', type: 'rest-finished' },
        schedule: { at, allowWhileIdle: true },
        isExactNotification: true
      }] });
    }

    async function cancelRestBackgroundNotification() {
      const plugin = localNotifications();
      if (!plugin) return;
      try { await plugin.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] }); } catch (_) {}
    }

    function renderNotificationSettings() {
      const text = document.getElementById('notificationSupportText');
      if (text) text.textContent = PLATFORM.isNative
        ? 'Os avisos são agendados no Android e funcionam com o app fechado.'
        : 'Disponível no APK Android. Na versão web, os lembretes dependem do navegador aberto.';
      const batteryNote = document.getElementById('notificationBatteryNote');
      if (batteryNote) batteryNote.classList.toggle('hidden', !PLATFORM.isNative);
      [['trainingRemindersToggle', 'trainingReminders'], ['restBackgroundNotificationToggle', 'restBackgroundNotification']].forEach(([id, field]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const on = !!getSettings()[field];
        el.disabled = !PLATFORM.isNative;
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        el.className = `relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-700'} ${PLATFORM.isNative ? '' : 'opacity-40 cursor-not-allowed'}`;
        el.innerHTML = `<span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${on ? 'left-[1.375rem]' : 'left-0.5'}"></span>`;
      });
    }

    async function toggleNotificationSetting(field) {
      try {
        if (!PLATFORM.isNative) {
          showToast('📱 Ative este recurso no APK Android.');
          return;
        }
        const next = !getSettings()[field];
        if (!next) {
          getSettings()[field] = false;
          saveSettings();
          renderNotificationSettings();
          if (field === 'trainingReminders') await cancelTrainingReminders();
          if (field === 'restBackgroundNotification') await cancelRestBackgroundNotification();
          return;
        }
        const permission = await ensureNotificationPermission();
        if (permission.display !== 'granted') {
          showToast('🔕 Permissão de notificações não concedida.');
          return;
        }
        if (field === 'restBackgroundNotification' && !await ensureExactRestAlarmPermission(localNotifications())) {
          showToast('⏱️ Para avisar no horário exato, permita alarmes e lembretes nas configurações do Android.');
          return;
        }
        getSettings()[field] = true;
        saveSettings();
        renderNotificationSettings();
        if (field === 'trainingReminders') await syncTrainingReminders(false);
        showToast(field === 'trainingReminders' ? '🔔 Lembretes de treino ativados!' : '⏰ Aviso de descanso em segundo plano ativado!');
      } catch (error) {
        console.error('Não foi possível atualizar as notificações.', error);
        showToast('⚠️ Não foi possível configurar os avisos agora.');
      }
    };

    return { syncTrainingReminders, scheduleRestBackgroundNotification, cancelRestBackgroundNotification, renderNotificationSettings, toggleNotificationSetting };
  }
};
