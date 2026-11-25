import { Icon } from './Icon';

/** Cadeado da carga travada: o leitor de tela diz "carga travada". */
export function LockMark({ className = 'size-3.5' }: { className?: string }) {
  return (
    <span role="img" aria-label="carga travada" title="Carga travada" className="inline-flex shrink-0 items-center align-[-0.15em] text-primary">
      <Icon name="cadeado" className={className} />
    </span>
  );
}
