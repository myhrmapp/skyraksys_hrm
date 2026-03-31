'use strict';

/**
 * Centralized date/time utilities for the HRM backend.
 *
 * All server-side date formatting goes through these helpers so that:
 *   1. Timestamps are always stored and compared in UTC.
 *   2. Human-readable strings (emails, PDFs) use a consistent Indian format.
 *   3. We never depend on the server's system locale / timezone.
 */

/**
 * Return the current instant as an ISO-8601 UTC string.
 * Use when you need an unambiguous timestamp for logging, API responses, etc.
 * @returns {string} e.g. "2026-03-29T13:00:00.000Z"
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Format a Date (or ISO string) as 'YYYY-MM-DD' using **UTC** components.
 * Safe for DB DATEONLY columns and date-string comparisons.
 * @param {Date|string} [date] - Defaults to now.
 * @returns {string} e.g. "2026-03-29"
 */
function formatDateUTC(date) {
  const d = date ? new Date(date) : new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date using **local** time components as 'YYYY-MM-DD'.
 * Use only when you explicitly need the server-local calendar date
 * (e.g. "today" for a scheduled job running in a known timezone).
 * @param {Date|string} [date] - Defaults to now.
 * @returns {string}
 */
function formatDateLocal(date) {
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date for human-readable display in emails / PDFs.
 * Always uses 'en-IN' + IST so output is deterministic regardless of server locale.
 * @param {Date|string} date
 * @param {object} [opts]
 * @param {boolean} [opts.includeTime=false] - Include HH:MM
 * @returns {string} e.g. "29 Mar 2026" or "29 Mar 2026, 06:30 PM"
 */
function formatForDisplay(date, { includeTime = false } = {}) {
  const d = date ? new Date(date) : new Date();
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'         // deterministic — always IST for display
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  return d.toLocaleString('en-IN', options);
}

/**
 * Format a Date as 'DD/MM/YYYY' (Indian date-only style for PDFs / payslips).
 * @param {Date|string} date
 * @returns {string} e.g. "29/03/2026"
 */
function formatDateIN(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

module.exports = {
  nowISO,
  formatDateUTC,
  formatDateLocal,
  formatForDisplay,
  formatDateIN,
};
