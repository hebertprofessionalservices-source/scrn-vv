import type { Editorial, Game, Team } from "./types";
import type { PowerRank } from "./power";
import { mondayKey } from "./weekly";
import { leagueOf } from "./team-format";

export interface EditorialContext {
  editorial: Editorial | null;
  hostPickGame: Game | null;
  /** One game of the week per league. */
  algorithmPicks: { mhsaa: Game | null; mais: Game | null };
}

/**
 * Best matchup of the COMING week (not the whole remaining schedule).
 * With a league given, only games between two teams of that league count,
 * and the "coming week" is that league's nearest week with games.
 */
export function pickAlgorithmGOTW(
  games: Game[],
  teams: Team[],
  power: Map<string, PowerRank>,
  today = new Date(),
  league?: "MHSAA" | "MAIS",
): Game | null {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const todayKey = today.toISOString().slice(0, 10);
  const upcoming = games.filter((g) => {
    if (g.status !== "scheduled" || g.date.slice(0, 10) < todayKey) return false;
    if (!league) return true;
    const home = byId.get(g.homeTeamId);
    const away = byId.get(g.awayTeamId);
    return (
      !!home && !!away &&
      leagueOf(home.classification) === league &&
      leagueOf(away.classification) === league
    );
  });
  if (upcoming.length === 0) return null;
  // Spotlight only the nearest calendar week that still has games.
  const week = upcoming.map((g) => mondayKey(g.date)).sort()[0];
  const candidates = upcoming.filter((g) => mondayKey(g.date) === week);

  let best: { game: Game; score: number } | null = null;
  for (const g of candidates) {
    const home = byId.get(g.homeTeamId);
    const away = byId.get(g.awayTeamId);
    if (!home || !away) continue;
    const hr = power.get(home.id)?.overallRank ?? 999;
    const ar = power.get(away.id)?.overallRank ?? 999;
    const rankScore =
      hr < 999 && ar < 999 ? 1000 - (hr + ar) : 500 - Math.min(hr, ar);
    const hw =
      home.record.wins /
      Math.max(1, home.record.wins + home.record.losses);
    const aw =
      away.record.wins / Math.max(1, away.record.wins + away.record.losses);
    const tightness = 1 - Math.abs(hw - aw);
    const score = rankScore + tightness * 50;
    if (!best || score > best.score) best = { game: g, score };
  }
  return best?.game ?? null;
}

export function buildEditorialContext(
  editorial: Editorial | null,
  games: Game[],
  teams: Team[],
  power: Map<string, PowerRank>,
  today = new Date(),
): EditorialContext {
  const byId = new Map(games.map((g) => [g.id, g]));
  const hostPickGame = editorial?.gameOfTheWeek?.gameId
    ? byId.get(editorial.gameOfTheWeek.gameId) ?? null
    : null;
  return {
    editorial,
    hostPickGame,
    algorithmPicks: {
      mhsaa: pickAlgorithmGOTW(games, teams, power, today, "MHSAA"),
      mais: pickAlgorithmGOTW(games, teams, power, today, "MAIS"),
    },
  };
}
