import { Icon } from './Icon';
import { useUiStore, type Tab } from '../store/ui-store';

const LABELS: Record<Tab, string> = {
  inicio: 'Início',
  plano: 'Plano',
  treino: 'Treino',
  progresso: 'Progresso',
  perfil: 'Perfil'
};

/** Barra inferior com o treino como botão central de destaque (N11). */
export function TabBar() {
  const tab = useUiStore(s => s.tab);
  const setTab = useUiStore(s => s.setTab);

  return (
    <nav aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {(Object.keys(LABELS) as Tab[]).map(key => {
          const active = key === tab;
          const central = key === 'treino';
          return (
            <li key={key} className="flex justify-center">
              <button type="button" onClick={() => setTab(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  active ? 'text-ink' : 'text-faint'}`}>
                <span className={central
                  ? `-mt-6 flex size-14 items-center justify-center rounded-full shadow-lg ${active ? 'bg-primary text-white' : 'bg-surface-2 text-ink'}`
                  : ''}>
                  <Icon name={key} />
                </span>
                {LABELS[key]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { LABELS as TAB_LABELS };
