window.TREINO_LOCAL_PERSISTENCE = {
  create({ getStorage, storageAvailable, isRestoringBackup, invalidateVolume, showToast }) {
    // Avisa uma única vez por sessão quando o armazenamento enche — antes o erro era engolido
    // em silêncio e o app continuava parecendo salvar sem salvar nada.
    let storageQuotaWarned = false;
    function saveJSON(key, obj) {
      if (isRestoringBackup()) return false;
      if (!storageAvailable) return false;
      try {
        getStorage().setItem(key, JSON.stringify(obj));
        // qualquer gravacao do log invalida o volume acumulado: deixar isso a cargo de quem
        // chama significaria um cache velho no dia em que alguem esquecesse
        if (key === 'treino_session_log') invalidateVolume(); // literal: SESSIONS_KEY e declarada adiante
        return true;
      } catch (e) {
        if (!storageQuotaWarned) {
          storageQuotaWarned = true;
          try { showToast('⚠️ Armazenamento cheio! Exporte um backup em Perfil > Dados e libere espaço.'); } catch (_) {}
        }
        console.error('Falha ao salvar', key, e);
        return false;
      }
    }


    return { saveJSON };
  }
};
