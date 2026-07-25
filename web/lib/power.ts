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
/** Client-set blend: MaxPreps' opinion carries this share of the rating. */
const MAXPREPS_WEIGHT = 0.7;

/**
 * SCRN Power Ranking — a weighted blend of two signals:
 *
 * 1. MaxPreps' ranking (MAXPREPS_WEIGHT = 70%) — the statewide list for
 *    MHSAA, the per-class rank for MAIS — mapped onto our rating scale by
 *    order statistics within each pool. Preseason, before MaxPreps
 *    publishes current ranks, their prior-season final rank stands in.
 * 2. Our own SRS rating (30%): average (capped) scoring margin plus the
 *    average rating of opponents, iterated to convergence — strength of
 *    schedule built in. Season-start rule: a team carries last season's
 *    final rating discounted by returning production (source "prior",
 *    labeled in the UI) until its first region game this season
 *    (independents: PRIOR_CUTOFF_GAMES finals), then switches to pure
 *    current-season SRS.
 *
 * Teams MaxPreps doesn't rank use our rating alone; teams with neither
 * games nor a prior stay unranked.
 *
 * MAIS 8-man teams (client rule): they play a different sport for ranking
 * purposes, so they always occupy the bottom of the overall (and league)
 * order regardless of rating — their rank only matters against other
 * 8-man teams, where the usual rating order applies.
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

  // Blend with MaxPreps: current rank when published, else last season's
  // final. MaxPreps ranks are only consistent WITHIN a pool — MHSAA is one
  // statewide list (stateOverall), while MAIS academies are ranked in
  // their home-state pools, so only their per-class rank (stateClass) is
  // comparable. Within each pool their #k team gets the k-th highest of
  // that pool's OWN ratings (order statistics), then MaxPreps' value is
  // averaged in at MAXPREPS_WEIGHT. Pools never trade rating mass, so
  // cross-league ordering stays anchored to our ratings.
  const poolOf = (id: string): string | null => {
    const t = data.teamsById.get(id);
    if (!t) return null;
    return t.classification.startsWith("MAIS") ? t.classification : "MHSAA";
  };
  const mpRank = new Map<string, number>();
  for (const id of finalRatings.keys()) {
    const t = data.teamsById.get(id);
    if (!t) continue;
    const current = t.classification.startsWith("MAIS")
      ? t.rankings.stateClass
      : t.rankings.stateOverall;
    const rank = current ?? data.priorStateRanks?.get(id);
    if (rank != null) mpRank.set(id, rank);
  }
  const poolMembers = new Map<string, string[]>();
  for (const id of finalRatings.keys()) {
    const pool = poolOf(id);
    if (!pool) continue;
    const list = poolMembers.get(pool) ?? [];
    list.push(id);
    poolMembers.set(pool, list);
  }
  const blended = new Map<string, number>();
  for (const members of poolMembers.values()) {
    const slots = members.map((id) => finalRatings.get(id)!).sort((a, b) => b - a);
    const ranked = members
      .filter((id) => mpRank.has(id))
      .sort((a, b) => mpRank.get(a)! - mpRank.get(b)!);
    ranked.forEach((id, i) => {
      const idx = ranked.length > 1
        ? Math.round((i * (slots.length - 1)) / (ranked.length - 1))
        : 0;
      const ours = finalRatings.get(id)!;
      blended.set(id, MAXPREPS_WEIGHT * slots[idx] + (1 - MAXPREPS_WEIGHT) * ours);
    });
  }
  for (const [id, v] of blended) finalRatings.set(id, v);

  // 8-man programs sink below every 11-man team; rating orders within.
  const is8Man = (id: string) =>
    data.teamsById.get(id)?.classification.startsWith("MAIS-8M") ?? false;
  const ordered = [...finalRatings.keys()].sort(
    (a, b) =>
      Number(is8Man(a)) - Number(is8Man(b)) ||
      finalRatings.get(b)! - finalRatings.get(a)!,
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
