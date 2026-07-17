import type { Dataset } from "./data";
import type { Team } from "./types";
import { displaySlug } from "./display-slug";
import { CLASS_ORDER } from "./leaderboard";
import { buildPowerRankings } from "./power";

export interface RecordWL {
  wins: number;
  losses: number;
}

export interface StandingRow {
  slug: string;
  name: string;
  logoUrl: string | null;
  classification: string;
  district: string | null;
  overall: RecordWL;
  /** null → n/a (team has no region or no resolvable region games). */
  region: RecordWL | null;
  regionSource: "official" | "derived" | null;
  /** 0–100, null → n/a (season concluded / no remaining region games). */
  playoffPct: number | null;
}

export interface RegionTable {
  classification: string;
  district: string;
  rows: StandingRow[];
}

export interface StandingsData {
  classes: string[];
  regions: RegionTable[];
}

/** Teams that advance to the playoffs from each region (MHSAA standard). */
export const PLAYOFF_SPOTS_PER_REGION = 4;
const SIMULATIONS = 2000;

interface RegionGame {
  homeId: string;
  awayId: string;
  district: string;
}

/** Deterministic PRNG so playoff percentages are stable between renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Team strength for win probabilities: the SCRN power rating (SRS), i.e.
 * average capped scoring margin adjusted for strength of schedule.
 * Unrated teams (no final games) sit at the league-average 0.
 */
export type Rate = (teamId: string) => number;

export function buildRatings(data: Dataset): Rate {
  const power = buildPowerRankings(data);
  return (teamId) => power.get(teamId)?.rating ?? 0;
}

/** P(home team beats away team) from the rating gap; ~7 points ≈ 73%. */
function winProbability(rate: Rate, homeId: string, awayId: string): number {
  return 1 / (1 + Math.exp(-(rate(homeId) - rate(awayId)) / 7));
}

interface RegionState {
  derived: Map<string, RecordWL>;
  remainingByDistrict: Map<string, RegionGame[]>;
}

/** Derive region records + remaining region games from the schedule. */
function collectRegionState(data: Dataset, todayKey: string): RegionState {
  const derived = new Map<string, RecordWL>();
  const remainingByDistrict = new Map<string, RegionGame[]>();
  for (const g of data.games) {
    const home = data.teamsByAlias.get(g.homeTeamId);
    const away = data.teamsByAlias.get(g.awayTeamId);
    if (!home || !away) continue;
    if (!home.district || home.district !== away.district) continue;
    const district = home.district;

    if (g.status === "final" && g.homeScore !== null && g.awayScore !== null) {
      if (g.homeScore === g.awayScore) continue;
      const winner = g.homeScore > g.awayScore ? home : away;
      const loser = winner === home ? away : home;
      bump(derived, winner.id, "wins");
      bump(derived, loser.id, "losses");
    } else if (g.status === "scheduled" && g.date.slice(0, 10) >= todayKey) {
      const list = remainingByDistrict.get(district) ?? [];
      list.push({ homeId: home.id, awayId: away.id, district });
      remainingByDistrict.set(district, list);
    }
  }
  return { derived, remainingByDistrict };
}

export function buildStandings(data: Dataset, today = new Date()): StandingsData {
  const todayKey = today.toISOString().slice(0, 10);
  const { derived, remainingByDistrict } = collectRegionState(data, todayKey);
  const rate = buildRatings(data);

  // Group teams into regions.
  const byRegion = new Map<string, Team[]>();
  for (const t of data.teams) {
    const key = `${t.classification}|${t.district ?? "Independent"}`;
    const list = byRegion.get(key) ?? [];
    list.push(t);
    byRegion.set(key, list);
  }

  const regions: RegionTable[] = [];
  for (const [key, teams] of byRegion) {
    const [classification, district] = key.split("|");
    const hasDistrict = district !== "Independent";
    const remaining = hasDistrict ? (remainingByDistrict.get(district) ?? []) : [];
    const playoffPcts = remaining.length > 0
      ? simulatePlayoffs(teams, derived, remaining, rate)
      : null;

    const rows: StandingRow[] = teams.map((t) => {
      const official = t.regionRecord ?? null;
      const derivedRec = derived.get(t.id) ?? null;
      const region = hasDistrict ? (official ?? derivedRec ?? { wins: 0, losses: 0 }) : null;
      return {
        slug: displaySlug(t),
        name: t.name,
        logoUrl: t.logoUrl,
        classification,
        district: hasDistrict ? district : null,
        overall: { wins: t.record.wins, losses: t.record.losses },
        region,
        regionSource: !hasDistrict ? null : official ? "official" : "derived",
        playoffPct: playoffPcts?.get(t.id) ?? null,
      };
    });

    rows.sort((a, b) =>
      pct(b.region) - pct(a.region) ||
      (b.region?.wins ?? 0) - (a.region?.wins ?? 0) ||
      pct(b.overall) - pct(a.overall) ||
      a.name.localeCompare(b.name),
    );
    regions.push({ classification, district, rows });
  }

  regions.sort((a, b) =>
    classIndex(a.classification) - classIndex(b.classification) ||
    districtNumber(a.district) - districtNumber(b.district) ||
    a.district.localeCompare(b.district),
  );

  const present = new Set(regions.map((r) => r.classification));
  const classes = [
    ...CLASS_ORDER.filter((c) => present.has(c)),
    ...[...present].filter((c) => !CLASS_ORDER.includes(c)).sort(),
  ];

  return { classes, regions };
}

function bump(map: Map<string, RecordWL>, id: string, field: keyof RecordWL): void {
  const rec = map.get(id) ?? { wins: 0, losses: 0 };
  rec[field] += 1;
  map.set(id, rec);
}

function pct(r: RecordWL | null): number {
  if (!r || r.wins + r.losses === 0) return 0;
  return r.wins / (r.wins + r.losses);
}

function classIndex(c: string): number {
  const i = CLASS_ORDER.indexOf(c);
  return i === -1 ? CLASS_ORDER.length : i;
}

function districtNumber(d: string): number {
  const m = d.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Monte Carlo playoff odds: play out the remaining region games with
 * rating-based (strength-of-schedule-adjusted) win probabilities; a team
 * makes the playoffs when it finishes in the region's top 4 (ties broken
 * randomly). Returns unrounded percentages (0–100).
 */
function simulatePlayoffs(
  teams: Team[],
  derived: Map<string, RecordWL>,
  remaining: RegionGame[],
  rate: Rate,
  forceWinner?: (g: RegionGame) => string | null,
): Map<string, number> {
  const ids = teams.map((t) => t.id);
  const madeIt = new Map<string, number>(ids.map((id) => [id, 0]));
  const rng = mulberry32(hashString(remaining[0].district));

  for (let s = 0; s < SIMULATIONS; s++) {
    const wins = new Map<string, number>(
      ids.map((id) => [id, derived.get(id)?.wins ?? 0]),
    );
    for (const g of remaining) {
      const forced = forceWinner?.(g) ?? null;
      if (forced) {
        wins.set(forced, (wins.get(forced) ?? 0) + 1);
        continue;
      }
      const winnerId =
        rng() < winProbability(rate, g.homeId, g.awayId) ? g.homeId : g.awayId;
      wins.set(winnerId, (wins.get(winnerId) ?? 0) + 1);
    }
    const order = [...ids].sort(
      (a, b) => (wins.get(b)! - wins.get(a)!) || rng() - 0.5,
    );
    for (const id of order.slice(0, PLAYOFF_SPOTS_PER_REGION)) {
      madeIt.set(id, madeIt.get(id)! + 1);
    }
  }

  return new Map(
    [...madeIt].map(([id, n]) => [id, (n / SIMULATIONS) * 100]),
  );
}

export interface ConditionalOdds {
  /** Playoff % for each team keyed by team id, under each outcome. */
  ifTeamWins: Map<string, number>;
  ifTeamLoses: Map<string, number>;
  teamAId: string;
  teamBId: string;
}

/**
 * "With a win / with a loss" playoff odds for a specific upcoming region
 * matchup between two same-district teams. Returns null when the teams are
 * not region rivals or no game between them remains on the schedule.
 */
export function playoffOddsForGame(
  data: Dataset,
  teamAId: string,
  teamBId: string,
  today = new Date(),
): ConditionalOdds | null {
  const a = data.teamsById.get(teamAId);
  const b = data.teamsById.get(teamBId);
  if (!a || !b || !a.district || a.district !== b.district) return null;
  if (a.classification !== b.classification) return null;

  const todayKey = today.toISOString().slice(0, 10);
  const { derived, remainingByDistrict } = collectRegionState(data, todayKey);
  const rate = buildRatings(data);
  const remaining = remainingByDistrict.get(a.district) ?? [];
  const isPair = (g: RegionGame) =>
    (g.homeId === teamAId && g.awayId === teamBId) ||
    (g.homeId === teamBId && g.awayId === teamAId);
  if (!remaining.some(isPair)) return null;

  const regionTeams = data.teams.filter(
    (t) => t.district === a.district && t.classification === a.classification,
  );
  const run = (winnerId: string) =>
    simulatePlayoffs(regionTeams, derived, remaining, rate, (g) =>
      isPair(g) ? winnerId : null,
    );

  return {
    ifTeamWins: run(teamAId),
    ifTeamLoses: run(teamBId),
    teamAId,
    teamBId,
  };
}

/** One team's region simulation; null when the team has no live region race. */
function regionPcts(
  data: Dataset,
  team: Team,
  derived: Map<string, RecordWL>,
  remainingByDistrict: Map<string, RegionGame[]>,
  rate: Rate,
  forceWinner?: (g: RegionGame) => string | null,
): Map<string, number> | null {
  if (!team.district) return null;
  const remaining = remainingByDistrict.get(team.district) ?? [];
  if (remaining.length === 0) return null;
  const regionTeams = data.teams.filter(
    (t) => t.district === team.district && t.classification === team.classification,
  );
  return simulatePlayoffs(regionTeams, derived, remaining, rate, forceWinner);
}

/** Current playoff potential (0–100, unrounded) for every team id; null → n/a. */
export function playoffPotentials(
  data: Dataset,
  today = new Date(),
): Map<string, number | null> {
  const todayKey = today.toISOString().slice(0, 10);
  const { derived, remainingByDistrict } = collectRegionState(data, todayKey);
  const rate = buildRatings(data);
  const cache = new Map<string, Map<string, number> | null>();
  const out = new Map<string, number | null>();
  for (const t of data.teams) {
    const key = `${t.classification}|${t.district ?? ""}`;
    if (!cache.has(key)) {
      cache.set(key, regionPcts(data, t, derived, remainingByDistrict, rate));
    }
    out.set(t.id, cache.get(key)?.get(t.id) ?? null);
  }
  return out;
}

export interface MatchupOutlook {
  current: number | null;
  ifWin: number | null;
  ifLoss: number | null;
}

/**
 * Playoff potential for both sides of any matchup, conditioned on the
 * game's outcome.
 *
 * Region rivals with the game still on the schedule get the exact forced
 * simulation. For any other pairing the result can't change region
 * standings directly, so the hypothetical game is folded into the team's
 * SOS-adjusted rating (one more game at ±7 vs that opponent) and the
 * region race re-simulated with the shifted rating — the honest, smaller
 * effect a non-region result has on the projection.
 */
export function matchupPlayoffOutlook(
  data: Dataset,
  teamAId: string,
  teamBId: string,
  today = new Date(),
): { a: MatchupOutlook; b: MatchupOutlook } | null {
  const a = data.teamsById.get(teamAId);
  const b = data.teamsById.get(teamBId);
  if (!a || !b) return null;

  const todayKey = today.toISOString().slice(0, 10);
  const { derived, remainingByDistrict } = collectRegionState(data, todayKey);
  const rate = buildRatings(data);

  const currentFor = (t: Team) =>
    regionPcts(data, t, derived, remainingByDistrict, rate)?.get(t.id) ?? null;

  const isPair = (g: RegionGame) =>
    (g.homeId === teamAId && g.awayId === teamBId) ||
    (g.homeId === teamBId && g.awayId === teamAId);
  const sameRegion =
    a.district && a.district === b.district && a.classification === b.classification;
  const pairRemains =
    sameRegion && (remainingByDistrict.get(a.district!) ?? []).some(isPair);

  if (pairRemains) {
    const run = (winnerId: string) =>
      regionPcts(data, a, derived, remainingByDistrict, rate, (g) =>
        isPair(g) ? winnerId : null,
      );
    const aWins = run(teamAId);
    const bWins = run(teamBId);
    return {
      a: {
        current: currentFor(a),
        ifWin: aWins?.get(a.id) ?? null,
        ifLoss: bWins?.get(a.id) ?? null,
      },
      b: {
        current: currentFor(b),
        ifWin: bWins?.get(b.id) ?? null,
        ifLoss: aWins?.get(b.id) ?? null,
      },
    };
  }

  const conditional = (t: Team, opp: Team, win: boolean): number | null => {
    const games = t.record.wins + t.record.losses;
    const r = rate(t.id);
    const shifted = r + ((win ? 7 : -7) + rate(opp.id) - r) / (games + 1);
    const shiftedRate: Rate = (id) => (id === t.id ? shifted : rate(id));
    return (
      regionPcts(data, t, derived, remainingByDistrict, shiftedRate)?.get(t.id) ??
      null
    );
  };

  return {
    a: {
      current: currentFor(a),
      ifWin: conditional(a, b, true),
      ifLoss: conditional(a, b, false),
    },
    b: {
      current: currentFor(b),
      ifWin: conditional(b, a, true),
      ifLoss: conditional(b, a, false),
    },
  };
}
