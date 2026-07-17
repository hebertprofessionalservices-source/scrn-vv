import type { Player } from "./types";
import type { PowerRank } from "./power";

/**
 * Returning production — the share of a team's prior-season output expected
 * back this season (every non-senior returns; seniors graduate). Transfers
 * and newcomers are unknowable from roster data, so this is an estimate.
 */

/** Below this much total production the share is too noisy to trust. */
const MIN_PRODUCTION = 200;

/** One player's production score (same weighting as roster ordering). */
function production(p: Player): number {
  const s = p.stats;
  return (
    s.passing.yds + s.rushing.yds + s.receiving.yds +
    s.defense.tackles * 8 + s.kicking.xpm + s.kicking.fgm * 3
  );
}

/** teamId -> share of production returning (0..1), null when unknown. */
export function returningShares(players: Player[]): Map<string, number | null> {
  const totals = new Map<string, { all: number; back: number }>();
  for (const p of players) {
    const t = totals.get(p.teamId) ?? { all: 0, back: 0 };
    const prod = production(p);
    t.all += prod;
    if (p.class !== "SR") t.back += prod;
    totals.set(p.teamId, t);
  }
  const out = new Map<string, number | null>();
  for (const [teamId, t] of totals) {
    out.set(
      teamId,
      t.all < MIN_PRODUCTION ? null : Math.max(0, Math.min(1, t.back / t.all)),
    );
  }
  return out;
}

/**
 * Preseason prior ratings discounted by returning production: a team that
 * graduated everything regresses to the league average (0); a team
 * returning everything keeps its full final rating. Teams whose share is
 * unknown (unpublished stats) get the league-median discount — otherwise
 * escaping the discount would float them above everyone else.
 */
export function adjustPriorRatings(
  power: Map<string, PowerRank>,
  returning: Map<string, number | null>,
): Map<string, number> {
  const known = [...returning.values()]
    .filter((s): s is number => s != null)
    .sort((a, b) => a - b);
  const fallback = known.length ? known[Math.floor(known.length / 2)] : 0.6;
  const out = new Map<string, number>();
  for (const [id, p] of power) {
    out.set(id, p.rating * (returning.get(id) ?? fallback));
  }
  return out;
}
