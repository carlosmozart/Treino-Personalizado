window.TREINO_TOOLTIPS = {
  create({ document, window, setTimeout, clearTimeout }) {
    // ---------- BOLHA COM O NOME COMPLETO ----------
    // Nomes longos sao truncados no card. Tocar no titulo abre uma bolha com o texto
    // inteiro, posicionada logo abaixo do proprio titulo e presa dentro da tela.
    let tooltipTimer = null;

    window.showNameTooltip = function(ev, texto) {
      const tip = document.getElementById('nameTooltip');
      const alvo = ev && ev.currentTarget;
      if (!tip || !alvo) return;

      // se o nome cabe inteiro na tela, nao ha o que revelar
      if (alvo.scrollWidth <= alvo.clientWidth + 1) return;

      if (ev.stopPropagation) ev.stopPropagation();  // nao recolhe o card junto

      tip.textContent = texto;
      tip.classList.remove('hidden');

      positionBubble(tip, alvo.getBoundingClientRect());
    };

    // Prende a bolha dentro da tela: logo abaixo do alvo quando cabe, acima quando nao cabe.
    // Se o alvo estiver fora da area visivel, as duas posicoes cairiam fora junto — dai a
    // trava final, para a bolha nunca aparecer em lugar nenhum.
    function positionBubble(tip, r) {
      const margem = 16;
      let left = r.left;
      if (left + tip.offsetWidth > window.innerWidth - margem) left = window.innerWidth - tip.offsetWidth - margem;
      if (left < margem) left = margem;
      let top = r.bottom + 6;
      if (top + tip.offsetHeight > window.innerHeight - margem) top = r.top - tip.offsetHeight - 6;
      const maxTop = window.innerHeight - tip.offsetHeight - margem;
      if (top > maxTop) top = maxTop;
      if (top < margem) top = margem;

      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(top)}px`;

      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(hideNameTooltip, 3500);
    }

    // Toque em qualquer ponto do grafico revela o registro mais proximo. E o toque em
    // qualquer lugar, nao na bolinha: com muitos registros elas ficam a poucos pixels uma da
    // outra e acertar uma delas no celular seria sorte.

    function hideNameTooltip() {
      clearTimeout(tooltipTimer);
      const tip = document.getElementById('nameTooltip');
      if (tip) tip.classList.add('hidden');
      // o ponto destacado sai junto: deixa-lo aceso apontaria para uma informacao que ja
      // nao esta mais na tela
      document.querySelectorAll('[data-sel],[data-guia]').forEach(el => { el.style.display = 'none'; });
    }

    // qualquer toque fora fecha a bolha
    document.addEventListener('touchstart', hideNameTooltip, { passive: true });
    document.addEventListener('click', hideNameTooltip);
    window.addEventListener('scroll', hideNameTooltip, { passive: true });


    return { positionBubble, hideNameTooltip };
  }
};
