export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Chave de comparação de nomes de exercício: sem acentos, minúscula e espaços simples. */
export function normalizeExerciseName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}
