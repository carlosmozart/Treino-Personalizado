// Fluxos de backup com estado de importação privado e serviços injetados.
window.TREINO_BACKUP_UI = {
  create({ window, document, navigator, buildBackupObject, backupFileName, encryptBackup, decryptBackup,
    isIOS, markBackupDone, showToast, copyTextToClipboard, MAX_BACKUP_BYTES, BACKUP_KEYS, JSON_BACKUP_KEYS,
    TREINO_BACKUP_VALIDATION, getLevelInfo, formatDateBR, escapeHtml, setRestoring, cancelDraftSave, restoreBackup,
    nativeBackupFile = () => null }) {
    async function exportBackup(protectedBackup = false) {
      let backup = buildBackupObject();
      let fileName = backupFileName();
      if (protectedBackup) {
        const password = window.prompt('Crie uma senha para proteger este backup (mínimo de 8 caracteres):');
        if (password === null) return;
        if (password.length < 8) { showToast('⚠️ Use uma senha com pelo menos 8 caracteres.'); return; }
        const confirmation = window.prompt('Repita a senha do backup:');
        if (confirmation !== password) { showToast('⚠️ As senhas não coincidem.'); return; }
        try { backup = await encryptBackup(backup, password); }
        catch (_) { showToast('❌ Não foi possível proteger o backup neste aparelho.'); return; }
        fileName = backupFileName().replace('treino-backup-', 'treino-backup-protegido-');
      }
      const json = JSON.stringify(backup, null, 2);
      const doneMessage = protectedBackup ? '🔐 Backup protegido salvo! Guarde a senha.' : '✅ Backup salvo! Guarde num lugar seguro.';

      // No APK, o WebView não tem a folha de compartilhamento e ignora links de download — o app
      // dizia "exportado" sem gerar arquivo. Lá o arquivo é salvo pelo seletor do Android.
      const BackupFile = nativeBackupFile();
      if (BackupFile) {
        try {
          await BackupFile.save({ fileName, content: json });
          markBackupDone();
          showToast(doneMessage);
        } catch (err) {
          if (err && err.code === 'CANCELLED') return;
          console.error('Falha ao salvar backup:', err);
          showToast('❌ Não foi possível salvar. Tente o botão de copiar.');
        }
        return;
      }

      // No iOS, um link com o atributo "download" não salva o arquivo — o Safari abre o
      // conteúdo como texto. O caminho que funciona lá é a folha de compartilhamento do
      // sistema, que também é mais prática no Android (manda direto pro Drive, WhatsApp...).
      try {
        // O iOS costuma oferecer destinos inadequados para application/json. Como o backup
        // é texto, text/plain dá uma prévia legível na folha de compartilhamento; a extensão
        // .json continua permitindo que o app o reconheça na restauração.
        const file = new File([json], fileName, { type: isIOS() ? 'text/plain' : 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: protectedBackup ? 'Backup protegido do Treino' : 'Backup do Treino',
            text: protectedBackup ? 'Backup protegido por senha do Treino Personalizado.' : 'Backup do Treino Personalizado — arquivo local para restauração.'
          });
          markBackupDone();
          showToast(protectedBackup ? '🔐 Backup protegido gerado! Guarde a senha.' : '✅ Backup gerado! Salve num lugar seguro.');
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return; // usuário cancelou a folha de compartilhamento
        console.warn('Compartilhamento indisponível, tentando download direto:', err);
      }

      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        markBackupDone();
        showToast(protectedBackup ? '🔐 Backup protegido exportado! Guarde a senha.' : '✅ Backup exportado! Confira em Downloads.');
      } catch (err) {
        console.error('Falha ao exportar backup:', err);
        showToast('❌ Não foi possível exportar. Tente o botão de copiar.');
      }
    };

    // Alternativa universal: joga o backup na área de transferência. Serve quando nem
    // compartilhar nem baixar funcionam (navegador antigo, WebView restrita).
    async function copyBackupToClipboard() {
      const json = JSON.stringify(buildBackupObject());
      const ok = await copyTextToClipboard(json);
      if (ok) markBackupDone();
      showToast(ok ? '📋 Backup copiado! Cole num bloco de notas e guarde.' : '❌ Não foi possível copiar o backup.');
    };

    function triggerImportBackup() {
      document.getElementById('importBackupInput').click();
    };

    let pendingImport = null;
    let importInProgress = false;

    function handleImportFile(input) {
      const file = input.files && input.files[0];
      input.value = ''; // permite reimportar o mesmo arquivo depois
      if (!file) return;
      if (file.size > MAX_BACKUP_BYTES) {
        showToast('❌ Backup muito grande. O limite é de 15 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          pendingImport = JSON.parse(String(reader.result));
          if (pendingImport && pendingImport.app === 'treino-personalizado' && pendingImport.backupVersion === 2 && pendingImport.encrypted === true) {
            const password = window.prompt('Digite a senha deste backup protegido:');
            if (password === null) { pendingImport = null; return; }
            pendingImport = await decryptBackup(pendingImport, password);
          }
        } catch (e) {
          pendingImport = null;
          showToast('❌ Não foi possível abrir o backup. Confira a senha e o arquivo.');
          return;
        }
        openImportConfirm(file.name);
      };
      reader.onerror = () => showToast('❌ Não foi possível ler o arquivo.');
      reader.readAsText(file);
    };

    function openImportConfirm(fileName) {
      if (!pendingImport || pendingImport.app !== 'treino-personalizado' || pendingImport.backupVersion !== 1 || !TREINO_BACKUP_VALIDATION.isValidEnvelope(pendingImport) || !TREINO_BACKUP_VALIDATION.isValidData(pendingImport.data, BACKUP_KEYS, JSON_BACKUP_KEYS)) {
        pendingImport = null;
        showToast('❌ Backup inválido ou corrompido. Use um arquivo exportado por este app.');
        return;
      }
      const d = pendingImport.data;
      const { checkinCount, sessionCount, level } = TREINO_BACKUP_VALIDATION.summarize(d, getLevelInfo);

      const when = pendingImport.exportedAt ? formatDateBR(pendingImport.exportedAt.slice(0, 10)) : 'data desconhecida';
      document.getElementById('importSummary').innerHTML =
        `<strong class="text-white">${escapeHtml(fileName)}</strong><br/>` +
        `Backup de ${escapeHtml(when)} · app v${escapeHtml(pendingImport.appVersion || '?')}<br/>` +
        `Contém <strong class="text-blue-300">${checkinCount} check-ins</strong>, ` +
        `<strong class="text-blue-300">${sessionCount} exercícios registrados</strong> e nível <strong class="text-blue-300">${level}</strong>.`;
      document.getElementById('importConfirmOverlay').classList.remove('hidden');
    }

    function cancelImport() {
      if (importInProgress) return;
      pendingImport = null;
      document.getElementById('importConfirmOverlay').classList.add('hidden');
    };

    async function confirmImport() {
      if (!pendingImport || importInProgress) return;
      if (!TREINO_BACKUP_VALIDATION.isValidEnvelope(pendingImport) || !TREINO_BACKUP_VALIDATION.isValidData(pendingImport.data, BACKUP_KEYS, JSON_BACKUP_KEYS)) {
        cancelImport();
        showToast('❌ Backup inválido ou corrompido. Seus dados não foram alterados.');
        return;
      }
      importInProgress = true;
      setRestoring(true);
      document.body.inert = true;
      cancelDraftSave();
      showToast('Restaurando backup…');
      try {
        await restoreBackup(pendingImport.data);
        pendingImport = null;
      } catch (err) {
        console.error('Falha ao importar:', err);
        if (err.recoveryRequired) {
          showToast('⚠️ Não foi possível recuperar os dados agora. Feche e reabra o app para tentar novamente.');
          return;
        }
        importInProgress = false;
        setRestoring(false);
        document.body.inert = false;
        showToast('❌ Backup não restaurado. Seus dados anteriores foram preservados.');
        return;
      }
      document.getElementById('importConfirmOverlay').classList.add('hidden');
      showToast('✅ Backup restaurado! Reabrindo o app...');
      setTimeout(() => window.location.reload(), 900);
    };
    return { exportBackup, copyBackupToClipboard, triggerImportBackup, handleImportFile, cancelImport, confirmImport };
  }
};
