import type { Dataset } from "./data";

export interface PowerRank {
  /**
   * SRS-based rating, still used for win probability and playoff odds. Null
   * when we have no resolvable results for the team — a rank does not depend
   * on it, so the entry still exists.
   */
  rating: number | null;
  /** MaxPreps' statewide rank; null when MaxPreps does not rank the team. */
  overallRank: number | null;
  /** MaxPreps' division rank; null when MaxPreps does not rank the team. */
  classRank: number | null;
}

/** Blowout cap so 70-0 games don't dominate the rating. */
const MARGIN_CAP = 28;
const ITERATIONS = 25;
/** Client-set blend: MaxPreps' opinion carries this share of the rating. */
const MAXPREPS_WEIGHT = 0.7;

/**
 * Ranks and ratings for the season.
 *
 * DISPLAYED RANKS ARE MAXPREPS' OWN (client rule, Sep 1 2026: "the rankings
 * should come from MaxPreps and MaxPreps only"). `overallRank` is their
 * statewide list, `classRank` their per-division list, both taken straight off
 * the team page with no reordering — a team MaxPreps does not rank has none.
 *
 * The rating is still ours, because a rank alone cannot produce a win
 * probability or a playoff projection. It is a weighted blend of:
 *
 * 1. MaxPreps' ranking (MAXPREPS_WEIGHT = 70%) — the statewide list for
 *    MHSAA, the per-class rank for MAIS — mapped onto our rating scale by
 *    order statistics within each pool.
 * 2. Our own SRS rating (30%): average (capped) scoring margin plus the
 *    average rating of opponents, iterated to convergence — strength of
 *    schedule built in.
 *
 * Nothing here reaches back into last season. The prior-rating carryover and
 * the prior-rank fallback were both removed on Sep 1 2026 so a 2026 page shows
 * 2026 numbers only; a team with no games this season simply has no rating.
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

  // No early return on an empty map: MaxPreps ranks stand without a rating,
  // so a season where nothing has been played yet still has ranks to show.
  const finalRatings = new Map<string, number>(
    ids.map((id) => [id, ratings.get(id)!]),
  );

  // Blend with MaxPreps. Their ranks are only consistent WITHIN a pool —
  // MHSAA is one statewide list (stateOverall), while MAIS academies are
  // ranked in their home-state pools, so only their per-class rank
  // (stateClass) is comparable. Within each pool their #k team gets the k-th
  // highest of that pool's OWN ratings (order statistics), then MaxPreps'
  // value is averaged in at MAXPREPS_WEIGHT. Pools never trade rating mass,
  // so cross-league ordering stays anchored to our ratings.
  const poolOf = (id: string): string | null => {
    const t = data.teamsById.get(id);
    if (!t) return null;
    return t.classification.startsWith("MAIS") ? t.classification : "MHSAA";
  };
  const mpRank = new Map<string, number>();
  for (const id of finalRatings.keys()) {
    const t = data.teamsById.get(id);
    if (!t) continue;
    const rank = t.classification.startsWith("MAIS")
      ? t.rankings.stateClass
      : t.rankings.stateOverall;
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

  // A rank is MaxPreps' and stands on its own, so entries are NOT gated on
  // having a rating. Oxford's only final was against an out-of-state school
  // that isn't in the dataset, which left it unrated — and it was showing no
  // rank at all even though MaxPreps had it 7th in the state.
  const out = new Map<string, PowerRank>();
  for (const t of data.teams) {
    const rating = finalRatings.get(t.id) ?? null;
    const overallRank = displayRank(t, "stateOverall");
    const classRank = displayRank(t, "stateClass");
    if (rating === null && overallRank === null && classRank === null) continue;
    out.set(t.id, { rating, overallRank, classRank });
  }
  return out;
}

/**
 * A MaxPreps rank, but only when it is a Mississippi one.
 *
 * 18 MAIS schools sit in Louisiana, Arkansas and Tennessee, and MaxPreps ranks
 * each team in its OWN state's pool. Printing a Louisiana academy's "No. 3
 * Overall" beside Mississippi teams reads as a Mississippi rank and is simply
 * wrong, so those teams show no rank rather than a misleading one.
 */
function displayRank(
  team: { maxprepsUrl: string | null; rankings: { stateOverall: number | null; stateClass: number | null } },
  field: "stateOverall" | "stateClass",
): number | null {
  if (!/maxpreps\.com\/ms\//.test(team.maxprepsUrl ?? "")) return null;
  return team.rankings[field];
}
