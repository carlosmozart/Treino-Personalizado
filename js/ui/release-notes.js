window.TREINO_RELEASE_NOTES = {
  create({
    document, window, RELEASE_NOTES, formatDateBR, saveString, APP_VERSION
  }) {
    // ---------- TELA DE NOVIDADES ----------
    const LAST_SEEN_VERSION_KEY = 'treino_last_seen_version';

    // O historico completo vive no CHANGELOG.md; no app so as ultimas versoes importam.
    // Sem esse corte, a lista cresce indefinidamente dentro do arquivo que o app baixa.
    const RELEASE_NOTES_NA_TELA = 5;

    function renderNovidades() {
      const current = RELEASE_NOTES[0];
      document.getElementById('novidadesCurrentVersion').innerHTML = `
        <p class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-2">Versão ${current.version} · ${formatDateBR(current.date)}</p>
        <ul class="space-y-2.5">
          ${current.highlights.map(h => `<li class="flex items-start gap-2"><span class="text-emerald-400 mt-0.5 flex-shrink-0">✓</span><span class="text-sm text-slate-200 text-justify">${h}</span></li>`).join('')}
        </ul>
      `;

      document.getElementById('versionHistoryList').innerHTML = RELEASE_NOTES.slice(1, RELEASE_NOTES_NA_TELA).map(r => `
        <div class="border-t border-slate-800 pt-3 mt-3 first:border-t-0 first:mt-0 first:pt-0">
          <p class="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1.5">Versão ${r.version} · ${formatDateBR(r.date)}</p>
          <ul class="space-y-1.5">
            ${r.highlights.map(h => `<li class="flex items-start gap-2"><span class="text-slate-700 mt-0.5 flex-shrink-0">•</span><span class="text-xs text-slate-400 text-justify">${h}</span></li>`).join('')}
          </ul>
        </div>
      `).join('');
    }

    window.openNovidades = function() {
      renderNovidades();
      document.getElementById('novidadesOverlay').classList.remove('hidden');
    };

    window.closeNovidades = function() {
      document.getElementById('novidadesOverlay').classList.add('hidden');
      saveString(LAST_SEEN_VERSION_KEY, APP_VERSION);
    };

    window.toggleVersionHistory = function() {
      const list = document.getElementById('versionHistoryList');
      const chevron = document.getElementById('versionHistoryChevron');
      list.classList.toggle('hidden');
      chevron.classList.toggle('rotate-180');
    };


    return { LAST_SEEN_VERSION_KEY };
  }
};
