import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  label: string;
  decimal?: boolean;
  className?: string;
}

const parse = (text: string) => Number(text.replace(',', '.'));
const show = (n: number) => String(n).replace('.', ',');

/**
 * Campo numérico com teclado do celular. Guarda o texto enquanto se digita ("22," é válido no
 * meio do caminho) e só repassa números válidos.
 */
export function NumberField({ value, onChange, label, decimal = false, className = '' }: Props) {
  const [text, setText] = useState(show(value));
  useEffect(() => {
    // valor mudou por fora (ex.: troca de exercício): reflete, sem atrapalhar o que se digita
    setText(current => (parse(current) === value ? current : show(value)));
  }, [value]);

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      value={text}
      onFocus={e => e.currentTarget.select()}
      onChange={e => {
        const next = e.currentTarget.value.replace(decimal ? /[^\d.,]/g : /\D/g, '').slice(0, 6);
        setText(next);
        const n = parse(next);
        if (next !== '' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setText(show(value))}
      className={`h-11 w-full min-w-0 rounded-xl border border-line bg-page text-center text-lg font-bold tabular-nums text-ink focus:border-primary focus:outline-none ${className}`}
    />
  );
}
