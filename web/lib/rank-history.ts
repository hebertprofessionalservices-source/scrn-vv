import type { PowerRank } from "./power";

/**
 * SCRN Power Ranking snapshots, written by `pnpm snapshot-ranks` whenever
 * the season's data updates. Keyed by snapshot date (ISO).
 *
 * Cadence follows the show: a snapshot is taken early in the game week
 * (before that week's Friday slate), and the Sunday recap reads movement
 * against it. So the baseline for a given day is the newest snapshot from
 * a PRIOR DAY — not a prior week, which would hide the current week's
 * own pre-game baseline on the very day the recap needs it.
 */
export interface RankHistory {
  [dateISO: string]: { [teamId: string]: { o: number; c: number } };
}

export interface RankDelta {
  /** Positive = moved UP that many spots since last week. */
  overall: number;
  class: number;
}

/**
 * Today's date in LOCAL time, not UTC.
 *
 * toISOString() rolls over at 19:00 Central, so an evening snapshot was
 * stamped with tomorrow's date while the site still thought it was today —
 * which made the fresh snapshot its own baseline and zeroed every arrow.
 * Snapshots are a local-evening act; the comparison has to agree.
 */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO date of the Monday of the date's calendar week. */
export function mondayOf(dateISO: string): string {
  const d = new Date(dateISO.slice(0, 10) + "T12:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * ISO date of the Sunday that opens the SHOW WEEK containing this date.
 *
 * The two podcasts are one editorial unit: MHSAA records Sunday and MAIS
 * records the Monday after, both recapping the same slate off the same
 * numbers. Anchoring the week to Sunday keeps that pair together.
 */
export function showWeekStart(dateISO: string): string {
  const d = new Date(dateISO.slice(0, 10) + "T12:00");
  d.setDate(d.getDate() - d.getDay()); // getDay() 0 = Sunday
  return todayISO(d);
}

/**
 * Movement vs the newest snapshot from an EARLIER SHOW WEEK.
 *
 * Snapshots are taken Sunday at 3pm, once MaxPreps has published the
 * post-slate rankings, and consecutive snapshots are what the arrows compare:
 * last Sunday's ranks against this Sunday's. Both shows read the same numbers.
 *
 * This used to select the newest snapshot from an earlier DAY, which was right
 * on Sunday but broke on Monday: yesterday's snapshot became the baseline, and
 * since MaxPreps does not republish between Sunday and Monday it held the very
 * ranks the page was displaying, so every delta came out zero and the MAIS show
 * had no arrows. Selecting by show week keeps Sunday and Monday on the same
 * baseline — the previous Sunday's snapshot — which is what both shows need.
 *
 * Teams absent from the baseline (or with no baseline at all) get no delta.
 */
export function computeRankDeltas(
  power: Map<string, PowerRank>,
  history: RankHistory,
  todayISO: string,
): Map<string, RankDelta> {
  const thisWeek = showWeekStart(todayISO);
  const baselineDate = Object.keys(history)
    .filter((d) => showWeekStart(d) < thisWeek)
    .sort()
    .pop();
  const out = new Map<string, RankDelta>();
  if (!baselineDate) return out;
  const baseline = history[baselineDate];
  for (const [teamId, rank] of power) {
    const prev = baseline[teamId];
    // No current MaxPreps rank means no movement to show.
    if (!prev || rank.overallRank === null || rank.classRank === null) continue;
    out.set(teamId, {
      overall: prev.o - rank.overallRank,
      class: prev.c - rank.classRank,
    });
  }
  return out;
}
