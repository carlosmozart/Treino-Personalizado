window.TREINO_CONFIRMATION = {
  create({ document }) {
    // ---------- CONFIRMAÇÃO GENÉRICA ----------
    // Devolve uma Promise<boolean>, então quem chama usa `if (await askConfirm(...))`,
    // igual ao confirm() nativo — mas sem sair da identidade visual do app.
    function askConfirm(options) {
      const opts = Object.assign({
        title: 'Confirmar',
        text: '',
        icon: '⚠️',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        danger: false
      }, options || {});

      return new Promise(resolve => {
        const overlay = document.getElementById('confirmOverlay');
        const box = document.getElementById('confirmOverlayBox');
        const okBtn = document.getElementById('confirmOverlayOk');
        const cancelBtn = document.getElementById('confirmOverlayCancel');

        document.getElementById('confirmOverlayIcon').textContent = opts.icon;
        document.getElementById('confirmOverlayTitle').textContent = opts.title;
        document.getElementById('confirmOverlayText').innerHTML = opts.text;
        okBtn.textContent = opts.confirmLabel;
        cancelBtn.textContent = opts.cancelLabel;

        box.className = `bg-slate-900 rounded-2xl border shadow-2xl max-w-sm w-full p-6 ${opts.danger ? 'border-rose-800/50' : 'border-slate-800'}`;
        okBtn.className = `flex-1 text-white font-extrabold text-sm py-3 rounded-xl transition-all active:scale-[0.99] ${opts.danger ? 'bg-rose-600 active:bg-rose-500' : 'bg-blue-600 active:bg-blue-500'}`;

        const finish = (result) => {
          overlay.classList.add('hidden');
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          overlay.removeEventListener('click', onBackdrop);
          document.removeEventListener('keydown', onKey);
          resolve(result);
        };
        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        // tocar fora da caixa cancela, como é praxe em modal de celular
        const onBackdrop = (e) => { if (e.target === overlay) finish(false); };
        const onKey = (e) => { if (e.key === 'Escape') finish(false); };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKey);

        overlay.classList.remove('hidden');
      });
    }


    return { askConfirm };
  }
};
