window.TREINO_MODAL_ACCESSIBILITY = {
  create({
    document, MutationObserver, requestAnimationFrame
  }) {
    // Mantém o teclado dentro do diálogo aberto e devolve o foco ao controle de origem.
    // Isso vale para todos os overlays, inclusive os criados antes desta melhoria.
    function setupModalAccessibility() {
      const overlays = Array.from(document.querySelectorAll('[id$="Overlay"]'));
      const previousFocus = new Map();
      const activeStack = [];
      const focusable = '[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const activeOverlay = () => activeStack.at(-1);

      overlays.forEach(overlay => {
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.tabIndex = -1;
        if (!overlay.hasAttribute('aria-label') && !overlay.hasAttribute('aria-labelledby')) {
          const heading = overlay.querySelector('h1, h2, h3');
          if (heading) {
            if (!heading.id) heading.id = `${overlay.id}Title`;
            overlay.setAttribute('aria-labelledby', heading.id);
          } else {
            overlay.setAttribute('aria-label', 'Janela de diálogo');
          }
        }
      });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const active = activeOverlay();
        if (!active) return;
        const controls = Array.from(active.querySelectorAll(focusable))
          .filter(control => !control.closest('.hidden'));
        if (!controls.length) {
          event.preventDefault();
          active.focus();
          return;
        }
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });

      const observer = new MutationObserver(records => {
        records.forEach(record => {
          const overlay = record.target;
          if (overlay.classList.contains('hidden')) {
            const index = activeStack.indexOf(overlay);
            if (index !== -1) activeStack.splice(index, 1);
            const trigger = previousFocus.get(overlay);
            previousFocus.delete(overlay);
            if (trigger && document.contains(trigger)) trigger.focus();
            return;
          }
          const index = activeStack.indexOf(overlay);
          if (index !== -1) activeStack.splice(index, 1);
          activeStack.push(overlay);
          previousFocus.set(overlay, document.activeElement);
          requestAnimationFrame(() => {
            const firstControl = overlay.querySelector(focusable);
            (firstControl || overlay).focus();
          });
        });
      });
      overlays.forEach(overlay => observer.observe(overlay, { attributes: true, attributeFilter: ['class'] }));
    }


    return { setupModalAccessibility };
  }
};
