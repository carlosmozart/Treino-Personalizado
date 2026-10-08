// Ícones em SVG próprios, traço simples (N13): aparência igual em qualquer celular, sem emoji.
const PATHS = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  plano: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  treino: 'M2 12h2m16 0h2M6 8v8m12-8v8M9 6v12m6-12v12M9 12h6',
  progresso: 'M5 20V12m5 8V6m5 14v-9m5 9V4',
  perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  fechar: 'M6 6l12 12M18 6L6 18',
  opcoes: 'M5 12h.01M12 12h.01M19 12h.01',
  trocar: 'M7 7h11l-3-3m3 13H7l3 3',
  nota: 'M5 4h10l4 4v12H5zM9 12h6M9 16h4',
  dica: 'M9 18h6m-5 3h4M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z',
  relogio: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  trofeu: 'M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4m8-4h3a3 3 0 01-3 4M12 13v4m-4 3h8',
  subir: 'M6 15l6-6 6 6',
  descer: 'M6 9l6 6 6-6',
  lixo: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  // três controles deslizantes: ajustes
  ajustes: 'M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1M15 4v4M9 10v4M17 16v4'
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
