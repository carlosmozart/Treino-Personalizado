// Barreira de erro: se uma tela quebra ao desenhar, o React desmonta tudo e sobraria uma página em
// branco. Aqui a pessoa vê o que houve, sabe que os dados estão guardados e tem como voltar.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useErrorLog } from '../platform/error-log';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // fica no registro de erros (Perfil → Sobre), para copiar e relatar
    useErrorLog.getState().report(error, `Tela${info.componentStack ? ` (${info.componentStack.trim().split('\n')[0]?.trim() ?? ''})` : ''}`);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6 py-10">
        <h1 className="text-2xl font-black">Algo deu errado nesta tela</h1>
        <p className="text-muted">Seus treinos e dados continuam guardados no aparelho. Tente de novo; se o erro voltar, recarregue o app.</p>
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted [overflow-wrap:anywhere]">{error.message || 'Erro sem descrição.'}</p>
        <div className="grid gap-2">
          <button type="button" onClick={() => this.setState({ error: null })} className="h-12 rounded-xl bg-primary text-base font-bold text-white">Tentar de novo</button>
          <button type="button" onClick={() => window.location.reload()} className="h-12 rounded-xl bg-surface-2 text-base font-bold">Recarregar o app</button>
        </div>
        <p className="text-xs text-faint">O erro ficou anotado em Perfil → Sobre → registro de erros, para você copiar e nos mandar.</p>
      </main>
    );
  }
}
