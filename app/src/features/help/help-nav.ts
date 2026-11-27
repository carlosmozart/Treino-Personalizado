// Ajuda: levar a pessoa até a função ("Ir até lá") e destacar onde ela está na tela.
import { useUiStore, type ProgressView, type Tab } from '../../store/ui-store';

export interface HelpTarget {
  tab: Tab;
  /** Vista do Progresso a abrir. */
  view?: ProgressView;
  /** Valor do atributo data-help do elemento a destacar. */
  anchor?: string;
}

const FLASH = 'help-flash';
const FLASH_MS = 2600;
const WAIT_MS = 2500;

/** O elemento marcado com data-help, quando está na tela. */
export const helpAnchor = (anchor: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-help="${CSS.escape(anchor)}"]`);

/** Espera o elemento aparecer (as abas Plano, Progresso e Perfil baixam na hora em que abrem). */
export function waitForAnchor(anchor: string, timeout = WAIT_MS): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const start = Date.now();
    const look = () => {
      const el = helpAnchor(anchor);
      if (el || Date.now() - start > timeout) resolve(el);
      else setTimeout(look, 50);
    };
    look();
  });
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Rola até o elemento e o contorna por alguns segundos. */
export async function flashAnchor(anchor: string): Promise<boolean> {
  const el = await waitForAnchor(anchor);
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  el.classList.remove(FLASH);
  void el.offsetWidth; // reinicia a animação se já estava destacado
  el.classList.add(FLASH);
  setTimeout(() => el.classList.remove(FLASH), FLASH_MS);
  return true;
}

/** Vai até a função: troca de aba (e de vista no Progresso) e destaca o lugar. */
export function goToHelp(target: HelpTarget): Promise<boolean> {
  const ui = useUiStore.getState();
  if (target.view) useUiStore.setState({ progressView: target.view });
  ui.setTab(target.tab);
  if (target.tab === 'inicio' || !target.anchor) window.scrollTo({ top: 0 });
  return target.anchor ? flashAnchor(target.anchor) : Promise.resolve(true);
}

/**
 * Fecha um painel e só depois navega: fechar pela interface volta uma entrada do histórico
 * (o voltar do Android), e trocar de aba antes disso faria essa volta desfazer a troca.
 */
export function afterSheetCloses(fn: () => void, win: Pick<Window, 'addEventListener' | 'removeEventListener'> = window) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    win.removeEventListener('popstate', run);
    fn();
  };
  win.addEventListener('popstate', run);
  setTimeout(run, 400);
}
