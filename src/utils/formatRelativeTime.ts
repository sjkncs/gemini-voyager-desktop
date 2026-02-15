import type { TranslationKey } from './translations';

type TranslateFn = (key: TranslationKey) => string;

/**
 * Shared relative time formatting utility.
 * Consolidates duplicated time formatting logic from:
 * - CloudSyncSettings (formatLastSync, formatLastUpload)
 * - StarredHistory (formatDate)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param t - Translation function from LanguageContext
 * @returns Localized relative time string
 */
export function formatRelativeTime(
  timestamp: number,
  t: TranslateFn,
): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return t('justNow');
  } else if (diffMins < 60) {
    return `${diffMins} ${t('minutesAgo')}`;
  } else if (diffHours < 24) {
    return `${diffHours} ${t('hoursAgo')}`;
  } else if (diffDays === 1) {
    return t('yesterday');
  } else if (diffDays < 7) {
    return `${diffDays} ${t('daysAgo')}`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format a nullable timestamp with a wrapper template.
 * Used by CloudSyncSettings for "Last synced: X" / "Last uploaded: X" patterns.
 *
 * @param timestamp - Unix timestamp or null
 * @param t - Translation function
 * @param nullKey - Translation key for null/never state (e.g. 'neverSynced')
 * @param templateKey - Translation key containing '{time}' placeholder (e.g. 'lastSynced')
 * @param templateFallback - Fallback template if translation is missing
 * @returns Formatted string
 */
export function formatTimestampWithTemplate(
  timestamp: number | null,
  t: TranslateFn,
  nullKey: TranslationKey,
  templateKey: TranslationKey,
  templateFallback?: string,
): string {
  if (!timestamp) return t(nullKey) || templateFallback || '';
  const timeStr = formatRelativeTime(timestamp, t);
  const template = t(templateKey) || templateFallback || '{time}';
  return template.replace('{time}', timeStr);
}
