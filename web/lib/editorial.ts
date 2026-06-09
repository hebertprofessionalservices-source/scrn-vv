import type { Editorial, Game, Team } from "./types";

export interface EditorialContext {
  editorial: Editorial | null;
  hostPickGame: Game | null;
  algorithmPickGame: Game | null;
}

export function pickAlgorithmGOTW(games: Game[], teams: Team[]): Game | null {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const candidates = games.filter((g) => g.status === "scheduled");
  if (candidates.length === 0) return null;

  let best: { game: Game; score: number } | null = null;
  for (const g of candidates) {
    const home = byId.get(g.homeTeamId);
    const away = byId.get(g.awayTeamId);
    if (!home || !away) continue;
    const hr = home.rankings.stateOverall ?? 999;
    const ar = away.rankings.stateOverall ?? 999;
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
  teams: Team[]
): EditorialContext {
  const byId = new Map(games.map((g) => [g.id, g]));
  const hostPickGame = editorial?.gameOfTheWeek?.gameId
    ? byId.get(editorial.gameOfTheWeek.gameId) ?? null
    : null;
  return {
    editorial,
    hostPickGame,
    algorithmPickGame: pickAlgorithmGOTW(games, teams),
  };
}
