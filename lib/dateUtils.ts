/**
 * Converts any date string to French format DD/MM/YYYY.
 * Handles ISO strings like "2025-06-15", "2025-06-15 00:00:00", and "15/06/2025".
 * Returns the original string if parsing fails.
 */
export function toFrenchDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }

  // ISO or SQL format: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }

  return dateStr;
}
