/**
 * Shared formatting utilities for squidweave UI.
 * Centralizes percentage, currency, and date formatting to eliminate
 * inconsistencies across components.
 */

/* ------------------------------------------------------------------ */
/*  Percent                                                            */
/* ------------------------------------------------------------------ */

/**
 * Format a numeric value as a percentage string.
 *
 * Auto-detects input scale:
 *   - Values ≤ 1 are assumed to be on a 0–1 scale (e.g. 0.032 → "3.2%")
 *   - Values > 1 are assumed to be on a 0–100 scale (e.g. 3.2 → "3.2%")
 *
 * @param value  The numeric value to format.
 * @param fallback  String returned when value is null/undefined. Defaults to '—'.
 */
export function formatPercent(value: number | null | undefined, fallback = '—'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value === 0) return '0%';
  const pct = value <= 1 ? value * 100 : value;
  // Show up to 1 decimal place, trimming trailing zeros
  const formatted = Math.abs(pct) >= 10
    ? Math.round(pct)
    : parseFloat(pct.toFixed(1));
  return `${formatted}%`;
}

/* ------------------------------------------------------------------ */
/*  Currency                                                           */
/* ------------------------------------------------------------------ */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a numeric value as a USD currency string.
 * e.g. 3050 → "$3,050.00"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '$0.00';
  return currencyFormatter.format(value);
}

/* ------------------------------------------------------------------ */
/*  Date                                                                */
/* ------------------------------------------------------------------ */

/**
 * Format a date value as a short human-readable string.
 * e.g. "Jan 5, 2026"
 *
 * @param date  A Date, ISO string, timestamp, or nullish value.
 * @param fallback  String returned when date is null/undefined/empty. Defaults to '—'.
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  fallback = '—',
): string {
  if (!date) return fallback;
  const d = date instanceof Date ? date : new Date(date as string | number);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date value as a short date without year.
 * e.g. "Jan 5" — matches the existing shortDate() pattern used in charts.
 */
export function formatShortDate(
  date: Date | string | number | null | undefined,
  fallback = '—',
): string {
  if (!date) return fallback;
  const d = date instanceof Date ? date : new Date(date as string | number);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date value as a short datetime with time.
 * e.g. "Jan 5, 02:30 PM"
 */
export function formatShortDateTime(
  date: Date | string | number | null | undefined,
  fallback = '—',
): string {
  if (!date) return fallback;
  const d = date instanceof Date ? date : new Date(date as string | number);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}