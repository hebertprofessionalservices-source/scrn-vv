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

function shares(
  players: Player[],
  metric: (p: Player) => number,
): Map<string, number | null> {
  const totals = new Map<string, { all: number; back: number }>();
  for (const p of players) {
    const t = totals.get(p.teamId) ?? { all: 0, back: 0 };
    const prod = metric(p);
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

/** teamId -> share of production returning (0..1), null when unknown. */
export function returningShares(players: Player[]): Map<string, number | null> {
  return shares(players, production);
}

/** teamId -> share of OFFENSIVE yardage returning (0..1), null when unknown. */
export function returningOffenseShares(players: Player[]): Map<string, number | null> {
  return shares(
    players,
    (p) => p.stats.passing.yds + p.stats.rushing.yds + p.stats.receiving.yds,
  );
}

const NEXT_CLASS: Record<string, string> = { FR: "So", SO: "Jr", JR: "Sr" };

export interface KeyReturner {
  playerId: string;
  name: string;
  position: string;
  /** Class they'll be THIS season (last season's class promoted). */
  nextClass: string;
  /** Last season's headline stat line, e.g. "1,204 rush yds · 15 TD". */
  line: string;
}

function headline(p: Player): string {
  const s = p.stats;
  const candidates: [number, string][] = [
    [s.passing.yds, `${s.passing.yds.toLocaleString()} pass yds · ${s.passing.td} TD`],
    [s.rushing.yds, `${s.rushing.yds.toLocaleString()} rush yds · ${s.rushing.td} TD`],
    [s.receiving.yds, `${s.receiving.rec} rec · ${s.receiving.yds.toLocaleString()} yds · ${s.receiving.td} TD`],
    [
      s.defense.tackles * 8,
      `${s.defense.tackles} tackles` +
        (s.defense.sacks ? ` · ${s.defense.sacks} sacks` : "") +
        (s.defense.int ? ` · ${s.defense.int} INT` : ""),
    ],
  ];
  candidates.sort((a, b) => b[0] - a[0]);
  return candidates[0][1];
}

/** Top returning stat leaders per team (non-seniors, by prior production). */
export function keyReturnersByTeam(
  players: Player[],
  limit = 5,
): Map<string, KeyReturner[]> {
  const byTeam = new Map<string, Player[]>();
  for (const p of players) {
    if (p.class === "SR" || production(p) <= 0) continue;
    const list = byTeam.get(p.teamId) ?? [];
    list.push(p);
    byTeam.set(p.teamId, list);
  }
  const out = new Map<string, KeyReturner[]>();
  for (const [teamId, list] of byTeam) {
    out.set(
      teamId,
      list
        .sort((a, b) => production(b) - production(a))
        .slice(0, limit)
        .map((p) => ({
          playerId: p.id,
          name: p.name,
          position: p.position,
          nextClass: NEXT_CLASS[p.class] ?? p.class,
          line: headline(p),
        })),
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
