import type { Game } from "./types";

const CENTRAL_TIME = "America/Chicago";

/** Today's date (YYYY-MM-DD) in Mississippi's timezone, not the server's. */
export function todayCentral(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TIME,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * The closest weekend relative to today: the upcoming Friday and its
 * Saturday. On a Saturday, the weekend is the one in progress (yesterday's
 * Friday + today), so today's games still show.
 */
export function closestWeekend(today: string): { friday: string; saturday: string } {
  const SATURDAY = 6;
  const FRIDAY = 5;
  const dow = dayOfWeek(today);
  const friday =
    dow === SATURDAY ? addDays(today, -1) : addDays(today, (FRIDAY - dow + 7) % 7);
  return { friday, saturday: addDays(friday, 1) };
}

function datePart(date: string): string {
  return date.slice(0, 10);
}

/** Games on the given day that haven't already been played. */
export function upcomingGamesOn(games: Game[], day: string, today: string): Game[] {
  return games
    .filter(
      (g) =>
        datePart(g.date) === day &&
        datePart(g.date) >= today &&
        g.status !== "final",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
