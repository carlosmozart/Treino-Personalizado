// Instalação no iPhone/iPad: o Safari não oferece instalar sozinho, só pelo menu Compartilhar.
import { isNative } from './platform';

export function isIos(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean {
  // iPadOS se apresenta como Mac; o toque denuncia
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

/** Aberto pelo ícone da Tela de Início (tela cheia), e não numa aba do navegador. */
export function isStandalone(): boolean {
  return (navigator as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
}

export function needsIosInstall(): boolean {
  return !isNative() && isIos() && !isStandalone();
}
