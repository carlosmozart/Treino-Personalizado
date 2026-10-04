// Ícones em SVG próprios, traço simples (N13): aparência igual em qualquer celular, sem emoji.
const PATHS = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  plano: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  treino: 'M2 12h2m16 0h2M6 8v8m12-8v8M9 6v12m6-12v12M9 12h6',
  progresso: 'M5 20V12m5 8V6m5 14v-9m5 9V4',
  perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0'
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'size-6' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
