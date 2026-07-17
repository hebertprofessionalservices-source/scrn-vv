import type { Dataset } from "./data";

export interface PowerRank {
  rating: number;
  overallRank: number;
  classRank: number;
  /** "prior" → rating is last season's final (display must label it). */
  source: "current" | "prior";
}

/** Blowout cap so 70-0 games don't dominate the rating. */
const MARGIN_CAP = 28;
const ITERATIONS = 25;
/** Fallback cutoff for teams with no region (independents). */
const PRIOR_CUTOFF_GAMES = 2;

/**
 * SCRN Power Ranking — a Simple Rating System (SRS): each team's rating is
 * its average (capped) scoring margin plus the average rating of its
 * opponents, iterated to convergence. Only games between two teams in the
 * dataset count.
 *
 * Season-start rule: a team carries last season's final rating (source
 * "prior", labeled in the UI) until it has played its first region game
 * this season; from then on the rating is purely this season's SRS — the
 * prior never bleeds into it. Teams without a region switch after
 * PRIOR_CUTOFF_GAMES finals instead. Teams with neither games nor a prior
 * stay unranked.
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

  const playedRegionGame = new Set<string>();
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
    if (
      home.district &&
      home.district === away.district &&
      home.classification === away.classification
    ) {
      playedRegionGame.add(home.id);
      playedRegionGame.add(away.id);
    }
  }

  const ids = [...results.keys()];

  const avgMargin = new Map<string, number>();
  for (const id of ids) {
    const e = results.get(id)!;
    avgMargin.set(id, e.margins.reduce((a, b) => a + b, 0) / e.margins.length);
  }

  let ratings = new Map<string, number>(avgMargin);
  for (let k = 0; k < ITERATIONS && ids.length > 0; k++) {
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

  // Season-start carryover: prior rating until the first region game
  // (independents: until PRIOR_CUTOFF_GAMES finals).
  const prior = data.priorRatings;
  const finalRatings = new Map<string, number>();
  const sources = new Map<string, PowerRank["source"]>();
  for (const id of ids) {
    const n = results.get(id)!.margins.length;
    const hasRegion = Boolean(data.teamsById.get(id)?.district);
    const isCurrent = hasRegion
      ? playedRegionGame.has(id)
      : n >= PRIOR_CUTOFF_GAMES;
    const p = prior?.get(id);
    if (!isCurrent && p !== undefined) {
      finalRatings.set(id, p);
      sources.set(id, "prior");
    } else {
      finalRatings.set(id, ratings.get(id)!);
      sources.set(id, "current");
    }
  }
  if (prior) {
    for (const [id, p] of prior) {
      if (!finalRatings.has(id) && data.teamsById.has(id)) {
        finalRatings.set(id, p);
        sources.set(id, "prior");
      }
    }
  }
  if (finalRatings.size === 0) return new Map();

  const ordered = [...finalRatings.keys()].sort(
    (a, b) => finalRatings.get(b)! - finalRatings.get(a)!,
  );
  const out = new Map<string, PowerRank>();
  const classCounters = new Map<string, number>();
  ordered.forEach((id, i) => {
    const cls = data.teamsById.get(id)?.classification ?? "";
    const classRank = (classCounters.get(cls) ?? 0) + 1;
    classCounters.set(cls, classRank);
    out.set(id, {
      rating: finalRatings.get(id)!,
      overallRank: i + 1,
      classRank,
      source: sources.get(id)!,
    });
  });
  return out;
}
