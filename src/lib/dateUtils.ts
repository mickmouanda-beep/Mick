/**
 * Utilitaire de gestion des dates et fuseau horaire de la République du Congo
 * Fuseau standard : Africa/Brazzaville (UTC+01:00)
 */

export const CONGO_TIMEZONE = 'Africa/Brazzaville';

/**
 * Formate une date ISO ou Timestamp en date et heure locale de Brazzaville (UTC+1).
 * Ex: "19/10/2026 14:35:20"
 */
export function formatBrazzavilleDateTime(
  dateInput: string | number | Date | null | undefined,
  includeSeconds = true
): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: CONGO_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formate une date en français long (ex: "19 octobre 2026")
 */
export function formatBrazzavilleDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: CONGO_TIMEZONE,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formate uniquement l'heure (ex: "14:35")
 */
export function formatBrazzavilleTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: CONGO_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Vérifie si une date d'expiration (en UTC ou ISO) est dépassée par rapport à l'heure actuelle
 */
export function isDateExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  try {
    const exp = new Date(expiresAt).getTime();
    if (isNaN(exp)) return false;
    return Date.now() > exp;
  } catch {
    return false;
  }
}

/**
 * Retourne l'heure actuelle au format ISO UTC
 */
export function getNowUtcIso(): string {
  return new Date().toISOString();
}
