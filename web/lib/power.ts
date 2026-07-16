import type { Dataset } from "./data";

export interface PowerRank {
  rating: number;
  overallRank: number;
  classRank: number;
}

/** Blowout cap so 70-0 games don't dominate the rating. */
const MARGIN_CAP = 28;
const ITERATIONS = 25;

/**
 * SCRN Power Ranking — a Simple Rating System (SRS): each team's rating is
 * its average (capped) scoring margin plus the average rating of its
 * opponents, iterated to convergence. Only games between two teams in the
 * dataset count; teams with no such final games are unranked.
 */
export function buildPowerRankings(data: Dataset): Map<string, PowerRank> {
  const results = new Map<string, { margins: number[]; opps: string[] }>();
  const entry = (id: string) => {
    let e = results.get(id);
    if (!e) {
      e = { margins: [], opps: [] };
      results.set(id, e);
    }
    return e;
  };

  for (const g of data.games) {
    if (g.status !== "final" || g.homeScore === null || g.awayScore === null) continue;
    const home = data.teamsByAlias.get(g.homeTeamId);
    const away = data.teamsByAlias.get(g.awayTeamId);
    if (!home || !away || home.id === away.id) continue;
    const margin = Math.max(-MARGIN_CAP, Math.min(MARGIN_CAP, g.homeScore - g.awayScore));
    entry(home.id).margins.push(margin);
    entry(home.id).opps.push(away.id);
    entry(away.id).margins.push(-margin);
    entry(away.id).opps.push(home.id);
  }

  const ids = [...results.keys()];
  if (ids.length === 0) return new Map();

  const avgMargin = new Map<string, number>();
  for (const id of ids) {
    const e = results.get(id)!;
    avgMargin.set(id, e.margins.reduce((a, b) => a + b, 0) / e.margins.length);
  }

  let ratings = new Map<string, number>(avgMargin);
  for (let k = 0; k < ITERATIONS; k++) {
    const next = new Map<string, number>();
    for (const id of ids) {
      const e = results.get(id)!;
      const sos = e.opps.reduce((sum, o) => sum + (ratings.get(o) ?? 0), 0) / e.opps.length;
      next.set(id, avgMargin.get(id)! + sos);
    }
    // Re-center so ratings don't drift.
    const mean = [...next.values()].reduce((a, b) => a + b, 0) / ids.length;
    for (const id of ids) next.set(id, next.get(id)! - mean);
    ratings = next;
  }

  const ordered = ids.sort((a, b) => ratings.get(b)! - ratings.get(a)!);
  const out = new Map<string, PowerRank>();
  const classCounters = new Map<string, number>();
  ordered.forEach((id, i) => {
    const cls = data.teamsById.get(id)?.classification ?? "";
    const classRank = (classCounters.get(cls) ?? 0) + 1;
    classCounters.set(cls, classRank);
    out.set(id, {
      rating: ratings.get(id)!,
      overallRank: i + 1,
      classRank,
    });
  });
  return out;
}
