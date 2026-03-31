/**
 * Human-friendly date formatting utilities.
 * All functions accept ISO date strings ("2026-03-30" or "2026-03-30T...").
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseLocal(iso: string): Date {
  // Parse "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM..." as local (not UTC)
  const [datePart] = iso.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "30 Mar 2026" */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = parseLocal(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "30 Mar" */
export function formatDateShort(iso: string): string {
  if (!iso) return '';
  const d = parseLocal(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Mon, 30 Mar" */
export function formatDateMed(iso: string): string {
  if (!iso) return '';
  const d = parseLocal(iso);
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "March 2026" */
export function formatMonthYear(month: number, year: number): string {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${MONTHS[month - 1]} ${year}`;
}

/** "30 Mar → 5 Apr" */
export function formatDateRange(startIso: string, endIso: string): string {
  if (!startIso) return '';
  const s = parseLocal(startIso);
  const e = parseLocal(endIso);
  const sy = s.getFullYear();
  const ey = e.getFullYear();
  if (sy !== ey) {
    return `${formatDate(startIso)} → ${formatDate(endIso)}`;
  }
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${sy}`;
  }
  return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} → ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${sy}`;
}

/** "2h 30m ago" | "Just now" | "3 days ago" */
export function timeAgo(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateShort(isoTimestamp);
}
