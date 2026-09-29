window.TREINO_APP_FEEDBACK = {
  create({
    document, window, toast, getHintsSeen, saveJSON, HINTS_KEY, setTimeout, clearTimeout
  }) {
    // ---------- DICAS DE DESCOBERTA (mostradas só até o usuário ver/usar o recurso) ----------
    function maybeShowSwipeHint() {
      if (getHintsSeen().swipe) return;
      document.getElementById('swipeHintBanner').classList.remove('hidden');
      setTimeout(() => window.dismissSwipeHint(), 6000);
    }

    window.dismissSwipeHint = function() {
      const banner = document.getElementById('swipeHintBanner');
      if (banner.classList.contains('hidden')) return;
      banner.classList.add('hidden');
      if (!getHintsSeen().swipe) {
        getHintsSeen().swipe = true;
        saveJSON(HINTS_KEY, getHintsSeen());
      }
    };

    // ---------- CABEÇALHO ENCOLHE AO ROLAR (ganha espaço de tela) ----------
    let headerCompact = false;
    let headerScrollFrame = null;
    function updateHeaderOnScroll() {
      const scrollY = window.scrollY;
      // Usa duas faixas de ativação para que a alteração de altura do cabeçalho
      // não faça a página alternar entre os estados perto do mesmo ponto.
      const shouldCompact = headerCompact ? scrollY > 20 : scrollY > 72;
      if (shouldCompact === headerCompact) return;
      headerCompact = shouldCompact;
      const header = document.getElementById('appHeader');
      const iconBox = document.getElementById('headerIconBox');
      const icon = document.getElementById('headerIconSvg');
      const title = document.getElementById('headerTitle');
      const subtitle = document.getElementById('headerSubtitle');
      const levelBarWrap = document.getElementById('levelBarWrap');

      if (headerCompact) {
        header.classList.remove('py-5');
        header.classList.add('py-2', 'header-compact');
        iconBox.classList.remove('p-2.5');
        iconBox.classList.add('p-1.5');
        icon.classList.remove('w-7', 'h-7');
        icon.classList.add('w-5', 'h-5');
        title.classList.remove('text-xl');
        title.classList.add('text-sm');
        subtitle.classList.add('opacity-0', 'max-h-0');
        levelBarWrap.classList.remove('mt-3');
        levelBarWrap.classList.add('mt-1.5');
      } else {
        header.classList.add('py-5');
        header.classList.remove('py-2', 'header-compact');
        iconBox.classList.add('p-2.5');
        iconBox.classList.remove('p-1.5');
        icon.classList.add('w-7', 'h-7');
        icon.classList.remove('w-5', 'h-5');
        title.classList.add('text-xl');
        title.classList.remove('text-sm');
        subtitle.classList.remove('opacity-0', 'max-h-0');
        levelBarWrap.classList.add('mt-3');
        levelBarWrap.classList.remove('mt-1.5');
      }
    }
    function scheduleHeaderUpdate() {
      if (headerScrollFrame !== null) return;
      headerScrollFrame = window.requestAnimationFrame(() => {
        headerScrollFrame = null;
        updateHeaderOnScroll();
      });
    }
    window.addEventListener('scroll', scheduleHeaderUpdate, { passive: true });
    updateHeaderOnScroll();

    // ---------- TOAST GENÉRICO (com fila) ----------
    // Vários eventos podem disparar toasts quase ao mesmo tempo (ex: concluir o último
    // exercício do dia dispara check-in + bônus de sequência + conquista). Antes, cada
    // novo toast cortava o anterior antes de dar tempo de ler. Agora eles entram numa fila
    // e são exibidos um de cada vez.
    let toastQueue = [];
    let toastActive = false;
    let toastTimeout = null;

    function showToast(message, icon = 'check') {
      toastQueue.push({ message, icon });
      processToastQueue();
    }

    function processToastQueue() {
      if (toastActive || toastQueue.length === 0) return;
      toastActive = true;
      const { message, icon } = toastQueue.shift();
      const iconPath = icon === 'trophy'
        ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        : 'M5 13l4 4L19 7';
      toast.querySelector('svg path').setAttribute('d', iconPath);
      toast.querySelector('span').textContent = message;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      toast.classList.add('opacity-100', 'toast-in');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('opacity-100', 'toast-in');
        toast.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          toastActive = false;
          processToastQueue();
        }, 250); // pequena pausa entre um toast e o próximo, pra não parecer um corte brusco
      }, 2600);
    }


    return { showToast, maybeShowSwipeHint, updateHeaderOnScroll };
  }
};
