// Indicadores e lembretes locais de backup; relógio e armazenamento injetados.
window.TREINO_BACKUP_STATUS = {
  create({ document, loadString, saveString, formatDateBR, getCheckins, showToast,
    clock = () => Date.now(), setTimeout = window.setTimeout.bind(window) }) {
    function renderBackupStatus() {
      const el = document.getElementById('backupStatusText');
      const box = document.getElementById('backupStatusBox');
      if (!el || !box) return;

      const last = loadString('treino_last_backup_at');
      if (!last) {
        el.innerHTML = '⚠️ Você ainda não exportou nenhum backup.';
        box.className = 'bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-2.5 mb-4';
        el.className = 'text-[11px] text-amber-300 font-semibold text-center';
        return;
      }

      const days = Math.floor((clock() - new Date(last).getTime()) / 86400000);
      const quando = days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
      const stale = days >= 14;
      el.innerHTML = `${stale ? '⚠️' : '✅'} Último backup ${quando} <span class="text-slate-500">(${formatDateBR(last.slice(0, 10))})</span>`;
      box.className = stale
        ? 'bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-2.5 mb-4'
        : 'bg-emerald-950/25 border border-emerald-800/40 rounded-xl px-3 py-2.5 mb-4';
      el.className = `text-[11px] font-semibold text-center ${stale ? 'text-amber-300' : 'text-emerald-300'}`;
    }

    // Aviso discreto para quem tem progresso real e nunca exportou nada. Aparece no máximo
    // uma vez a cada 7 dias para não virar incômodo.
    function maybeSuggestBackup() {
      const totalCheckins = Object.keys(getCheckins()).length;
      if (totalCheckins < 5) return; // pouco a perder ainda: não vale interromper

      const lastBackup = loadString('treino_last_backup_at');
      const lastNag = loadString('treino_last_backup_nag');
      const now = clock();
      const daysSince = (iso) => iso ? (now - new Date(iso).getTime()) / 86400000 : Infinity;

      if (daysSince(lastBackup) < 14) return;  // backup recente: nada a dizer
      if (daysSince(lastNag) < 7) return;      // já avisou essa semana

      saveString('treino_last_backup_nag', new Date(clock()).toISOString());
      setTimeout(() => {
        showToast(lastBackup
          ? '🛟 Faz tempo que você não exporta um backup. Perfil > Dados.'
          : '🛟 Proteja seu progresso: exporte um backup em Perfil > Dados.');
      }, 2500);
    }

    function markBackupDone() {
      saveString('treino_last_backup_at', new Date(clock()).toISOString());
      renderBackupStatus();
    }
    return { renderBackupStatus, maybeSuggestBackup, markBackupDone };
  }
};
