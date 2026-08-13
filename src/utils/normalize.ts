/**
 * Normalizes name strings for accurate matching
 * Removes diacritics/accents, converts to uppercase, removes extra spaces
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}
