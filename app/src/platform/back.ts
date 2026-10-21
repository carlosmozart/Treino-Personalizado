// Botão/gesto voltar (O9) pelo histórico do navegador: no APK o Capacitor chama goBack() do
// WebView enquanto houver histórico e só fecha o app quando não houver. Assim, sem plugin:
// voltar fecha o painel aberto → volta para o Início → sai do app.

interface Layer { id: number; close: () => void }

interface HistoryLike {
  readonly state: unknown;
  pushState(data: unknown, unused: string): void;
  replaceState(data: unknown, unused: string): void;
  back(): void;
}

export interface BackNavigation {
  /** Registra um painel aberto; devolve a função a chamar quando ele fechar pela interface. */
  pushLayer(close: () => void): () => void;
  /** Mudança de aba feita pela interface. */
  goTab(tab: string): void;
  /** Trata o evento popstate. */
  onPopState(state: unknown): void;
}

const HOME = 'inicio';
const tabOf = (state: unknown) => (state && typeof state === 'object' && 'tab' in state ? String((state as { tab: unknown }).tab) : null);

/**
 * `defer` adia o history.back() de um painel fechado pela interface para depois do render: se outro
 * painel abrir logo em seguida (lista → detalhe), ele reaproveita a entrada em vez de empilhar uma
 * nova. Sem isso, o back() assíncrono se cruza com o pushState do painel novo, cada troca come uma
 * entrada e o voltar acaba saindo do app.
 */
export function createBackNavigation(history: HistoryLike, getTab: () => string, setTab: (tab: string) => void, defer: (fn: () => void) => void = queueMicrotask): BackNavigation {
  const layers: Layer[] = [];
  let nextId = 1;
  /** popstates provocados por nós mesmos (history.back() ao fechar pela interface). */
  let ignore = 0;
  /** Entradas de painéis fechados pela interface que ainda não voltaram (ver `defer`). */
  let pendingBacks = 0;

  const silentBack = () => { ignore++; history.back(); };
  const flushBacks = () => { while (pendingBacks > 0) { pendingBacks--; silentBack(); } };

  return {
    pushLayer(close) {
      const layer = { id: nextId++, close };
      layers.push(layer);
      if (pendingBacks > 0) { pendingBacks--; history.replaceState({ tab: getTab(), layer: layer.id }, ''); }
      else history.pushState({ tab: getTab(), layer: layer.id }, '');
      return () => {
        const i = layers.indexOf(layer);
        if (i < 0) return; // já fechado pelo voltar
        layers.splice(i, 1);
        pendingBacks++;
        defer(flushBacks);
      };
    },

    goTab(tab) {
      flushBacks();
      const current = getTab();
      if (tab === current) return;
      setTab(tab);
      if (tab === HOME) { if (tabOf(history.state) && tabOf(history.state) !== HOME) silentBack(); }
      else if (current === HOME) history.pushState({ tab }, '');
      else history.replaceState({ tab }, '');
    },

    onPopState(state) {
      if (ignore > 0) { ignore--; return; }
      const top = layers.pop();
      if (top) { top.close(); return; }
      setTab(tabOf(state) ?? HOME);
    }
  };
}
