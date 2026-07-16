import type { Dataset } from "./data";
import type { Team } from "./types";
import { displaySlug } from "./display-slug";
import { CLASS_ORDER } from "./leaderboard";

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

/** Average scoring margin per game — the rating behind win probabilities. */
function margin(t: Team): number {
  const games = t.record.wins + t.record.losses;
  if (games === 0) return 0;
  return (t.stats.pointsFor - t.stats.pointsAgainst) / games;
}

/** P(home team beats away team) from the margin gap; ~7 points ≈ 73%. */
function winProbability(home: Team, away: Team): number {
  return 1 / (1 + Math.exp(-(margin(home) - margin(away)) / 7));
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
      ? simulatePlayoffs(teams, derived, remaining, data.teamsById)
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
 * margin-based win probabilities; a team makes the playoffs when it finishes
 * in the region's top 4 (ties broken randomly).
 */
function simulatePlayoffs(
  teams: Team[],
  derived: Map<string, RecordWL>,
  remaining: RegionGame[],
  teamsById: Map<string, Team>,
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
      const home = teamsById.get(g.homeId);
      const away = teamsById.get(g.awayId);
      if (!home || !away) continue;
      const winnerId = rng() < winProbability(home, away) ? g.homeId : g.awayId;
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
    [...madeIt].map(([id, n]) => [id, Math.round((n / SIMULATIONS) * 100)]),
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
  const remaining = remainingByDistrict.get(a.district) ?? [];
  const isPair = (g: RegionGame) =>
    (g.homeId === teamAId && g.awayId === teamBId) ||
    (g.homeId === teamBId && g.awayId === teamAId);
  if (!remaining.some(isPair)) return null;

  const regionTeams = data.teams.filter(
    (t) => t.district === a.district && t.classification === a.classification,
  );
  const run = (winnerId: string) =>
    simulatePlayoffs(regionTeams, derived, remaining, data.teamsById, (g) =>
      isPair(g) ? winnerId : null,
    );

  return {
    ifTeamWins: run(teamAId),
    ifTeamLoses: run(teamBId),
    teamAId,
    teamBId,
  };
}
