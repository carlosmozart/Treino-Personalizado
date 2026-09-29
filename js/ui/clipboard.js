window.TREINO_CLIPBOARD = {
  create({
    document, window, navigator, PLATFORM
  }) {
    async function copyTextToClipboard(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) { /* segue para o método antigo */ }

      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);

        if (PLATFORM.isIOS) {
          // no iOS a seleção só funciona por Range; ta.select() sozinho não seleciona nada
          const range = document.createRange();
          range.selectNodeContents(ta);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          ta.setSelectionRange(0, text.length);
        } else {
          ta.select();
        }

        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) {
        console.error('Falha ao copiar:', e);
        return false;
      }
    }


    return { copyTextToClipboard };
  }
};
