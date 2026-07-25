import type { PowerRank } from "./power";

/**
 * Weekly SCRN Power Ranking snapshots, written by `pnpm snapshot-ranks`
 * whenever the season's data updates. Keyed by snapshot date (ISO);
 * one entry per calendar week — a re-run within the same week replaces
 * that week's entry, earlier weeks stay frozen.
 */
export interface RankHistory {
  [dateISO: string]: { [teamId: string]: { o: number; c: number } };
}

export interface RankDelta {
  /** Positive = moved UP that many spots since last week. */
  overall: number;
  class: number;
}

/** ISO date of the Monday of the date's calendar week. */
export function mondayOf(dateISO: string): string {
  const d = new Date(dateISO.slice(0, 10) + "T12:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Movement vs the newest snapshot taken in an EARLIER week than today.
 * Teams absent from the baseline (or with no baseline at all) get no delta.
 */
export function computeRankDeltas(
  power: Map<string, PowerRank>,
  history: RankHistory,
  todayISO: string,
): Map<string, RankDelta> {
  const thisWeek = mondayOf(todayISO);
  const baselineDate = Object.keys(history)
    .filter((d) => mondayOf(d) < thisWeek)
    .sort()
    .pop();
  const out = new Map<string, RankDelta>();
  if (!baselineDate) return out;
  const baseline = history[baselineDate];
  for (const [teamId, rank] of power) {
    const prev = baseline[teamId];
    if (!prev) continue;
    out.set(teamId, {
      overall: prev.o - rank.overallRank,
      class: prev.c - rank.classRank,
    });
  }
  return out;
}
