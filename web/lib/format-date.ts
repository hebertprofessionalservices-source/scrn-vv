const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "2025-08-29T19:00" -> "Aug 29, 2025 - 7:00pm"
 * "2025-08-29"       -> "Aug 29, 2025" (no time available)
 *
 * Parsed manually (not via Date) so the calendar date never shifts with
 * the server's timezone.
 */
export function formatGameDate(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return date;
  const [, year, month, day, hh, mm] = m;
  const formatted = `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
  if (hh === undefined || (hh === "00" && mm === "00")) return formatted;
  const hour24 = Number(hh);
  const meridiem = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${formatted} - ${hour12}:${mm}${meridiem}`;
}
