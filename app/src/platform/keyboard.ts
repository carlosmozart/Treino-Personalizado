// Teclado cobrindo campos (O10): com a tela de ponta a ponta do Android 15+, o WebView nem
// sempre rola o campo focado para cima do teclado. Quando a área visível encolhe, rola o campo
// focado para o meio dela.
export function keepFocusedFieldVisible(win: Window = window) {
  const vv = win.visualViewport;
  if (!vv) return;
  const reveal = () => {
    const el = win.document.activeElement;
    if (el instanceof HTMLElement && el.matches('input, textarea, select')) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  vv.addEventListener('resize', reveal);
  win.document.addEventListener('focusin', () => setTimeout(reveal, 300));
}
