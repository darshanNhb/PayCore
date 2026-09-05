/**
 * Centralized formatting utilities for currency, dates, and numbers.
 * All currency formatting uses en-IN locale with ₹ symbol by default,
 * configurable per company later without a rewrite.
 *
 * @see PayCore_Build_Prompt.md Section 11 (i18n-readiness)
 */

// ── Currency ─────────────────────────────────

const DEFAULT_LOCALE = "en-IN";
const DEFAULT_CURRENCY = "INR";

/**
 * Format a number as currency (₹1,23,456).
 */
export function formatCurrency(
  amount: number | string,
  options?: { locale?: string; currency?: string }
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const locale = options?.locale || DEFAULT_LOCALE;
  const currency = options?.currency || DEFAULT_CURRENCY;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number in lakhs (₹18.4L).
 */
export function formatInLakhs(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const inLakhs = num / 100000;
  return `₹${inLakhs.toFixed(1)}L`;
}

// ── Dates ────────────────────────────────────

/**
 * Format a date as "18 Sep 2026".
 */
export function formatDate(
  date: Date | string,
  options?: { locale?: string }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(options?.locale || DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date range as "01 Sep – 30 Sep 2026".
 */
export function formatDateRange(
  start: Date | string,
  end: Date | string
): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Format a time as "09:30 AM".
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a duration in minutes as "08h 32m".
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

/**
 * Format elapsed seconds as "HH:MM:SS" (for attendance timer).
 */
export function formatElapsedTime(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ── Numbers ──────────────────────────────────

/**
 * Format a percentage with optional decimal places.
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}
