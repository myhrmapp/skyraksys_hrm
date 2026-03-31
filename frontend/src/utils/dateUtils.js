import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ────────────────────────────────────────────────────────────
//  Default display timezone.
//  This is the timezone used when rendering dates for the user.
//  For a single-org Indian HRM the default is Asia/Kolkata.
//  If multi-timezone support is added later, read from user
//  profile / context instead.
// ────────────────────────────────────────────────────────────
const DISPLAY_TZ = 'Asia/Kolkata';

// ────────────────────────────────────────────────────────────
//  SENDING DATES TO THE API
// ────────────────────────────────────────────────────────────

/**
 * Convert a date value to a 'YYYY-MM-DD' string suitable for
 * API DATEONLY fields (leave dates, hire date, pay period, etc.).
 * Uses the **display timezone** so the calendar date matches
 * what the user sees on screen.
 *
 * @param {Date|string|dayjs.Dayjs} date
 * @returns {string} e.g. "2026-03-29"
 */
export function toAPIDate(date) {
  return dayjs(date).tz(DISPLAY_TZ).format('YYYY-MM-DD');
}

/**
 * Convert a datetime value to a full ISO-8601 UTC string
 * suitable for API TIMESTAMP fields (check-in/out, etc.).
 *
 * @param {Date|string|dayjs.Dayjs} date
 * @returns {string} e.g. "2026-03-29T03:30:00.000Z"
 */
export function toAPIDateTime(date) {
  return dayjs(date).utc().toISOString();
}

// ────────────────────────────────────────────────────────────
//  DISPLAYING DATES FROM THE API
// ────────────────────────────────────────────────────────────

/**
 * Format a date-only value (API returns "2026-03-29") for display.
 * @param {string|Date|dayjs.Dayjs} date
 * @param {string} [fmt='DD MMM YYYY'] - dayjs format token
 * @returns {string} e.g. "29 Mar 2026"
 */
export function displayDate(date, fmt = 'DD MMM YYYY') {
  if (!date) return 'N/A';
  const d = dayjs(date);
  return d.isValid() ? d.format(fmt) : 'Invalid Date';
}

/**
 * Format a timestamp value (API returns ISO string) for display
 * in the user's display timezone.
 * @param {string|Date|dayjs.Dayjs} date
 * @param {string} [fmt='DD MMM YYYY, hh:mm A'] - dayjs format token
 * @returns {string} e.g. "29 Mar 2026, 09:00 AM"
 */
export function displayDateTime(date, fmt = 'DD MMM YYYY, hh:mm A') {
  if (!date) return 'N/A';
  const d = dayjs(date).tz(DISPLAY_TZ);
  return d.isValid() ? d.format(fmt) : 'Invalid Date';
}

/**
 * Format a timestamp as time-only in the user's display timezone.
 * @param {string|Date|dayjs.Dayjs} date
 * @param {string} [fmt='hh:mm A']
 * @returns {string} e.g. "09:00 AM"
 */
export function displayTime(date, fmt = 'hh:mm A') {
  if (!date) return '—';
  const d = dayjs(date).tz(DISPLAY_TZ);
  return d.isValid() ? d.format(fmt) : '—';
}

/**
 * Return the dayjs instance (or `null`) already set to the display timezone.
 * Useful when you need the full dayjs API (e.g. `.isBefore()`, `.startOf()`).
 * @param {string|Date|dayjs.Dayjs} date
 * @returns {dayjs.Dayjs|null}
 */
export function toDayjs(date) {
  if (!date) return null;
  const d = dayjs(date).tz(DISPLAY_TZ);
  return d.isValid() ? d : null;
}

export { DISPLAY_TZ };
