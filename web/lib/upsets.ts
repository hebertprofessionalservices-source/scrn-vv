import type { Dataset } from "./data";
import type { Game, Team } from "./types";
import { buildRatings, winProbability, type Rate } from "./standings";
import { lastWeeksGames } from "./stats";
import { isEightMan, leagueOf } from "./team-format";

/** A favourite with at least this win probability losing counts as an upset. */
export const UPSET_THRESHOLD = 0.8;
export const UPSET_LIMIT = 3;

export interface UpsetSide {
  team: Team;
  score: number;
}

export interface Upset {
  gameId: string;
  /** The rated favourite, who lost. */
  favorite: UpsetSide;
  /** The underdog, who won. */
  winner: UpsetSide;
  /** The favourite's pre-game win probability, 0-1. Higher = bigger upset. */
  favoriteWinProb: number;
  /** True when it cleared UPSET_THRESHOLD rather than being a top-up pick. */
  clearedThreshold: boolean;
}

/**
 * Biggest upsets from the previous week, per league.
 *
 * Ranked by how heavily the loser was favoured. Results at or above
 * UPSET_THRESHOLD come first; if a league has fewer than `limit` of those, the
 * next-closest upsets top the list up so the section is never short — the
 * client asked for the highest three either way.
 */
export function buildUpsets(
  data: Dataset,
  league: "MHSAA" | "MAIS",
  {
    rate = buildRatings(data),
    today,
    limit = UPSET_LIMIT,
  }: { rate?: Rate; today?: Date; limit?: number } = {},
): Upset[] {
  const games = today
    ? lastWeeksGames(data.games, today)
    : lastWeeksGames(data.games);
  const found: Upset[] = [];

  for (const g of games) {
    const home = data.teamsByAlias.get(g.homeTeamId);
    const away = data.teamsByAlias.get(g.awayTeamId);
    if (!home || !away || home.id === away.id) continue;
    if (g.homeScore === null || g.awayScore === null) continue;
    if (g.homeScore === g.awayScore) continue; // ties aren't upsets
    // 8-Man ratings aren't comparable with the 11-man game, so a cross-code
    // "upset" is a modelling artefact rather than a result worth surfacing.
    if (isEightMan(home.classification) || isEightMan(away.classification)) continue;
    if (gameLeague(home, away) !== league) continue;

    const homeWon = g.homeScore > g.awayScore;
    const winnerTeam = homeWon ? home : away;
    const loserTeam = homeWon ? away : home;
    const loserProb = winProbability(rate, loserTeam.id, winnerTeam.id);
    // Only a loss by the rated favourite is an upset at all.
    if (loserProb <= 0.5) continue;

    found.push({
      gameId: g.id,
      favorite: { team: loserTeam, score: homeWon ? g.awayScore : g.homeScore },
      winner: { team: winnerTeam, score: homeWon ? g.homeScore : g.awayScore },
      favoriteWinProb: loserProb,
      clearedThreshold: loserProb >= UPSET_THRESHOLD,
    });
  }

  found.sort((a, b) => b.favoriteWinProb - a.favoriteWinProb);
  return found.slice(0, limit);
}

/**
 * Which league a game belongs to. Matches the Schedules page: the home team
 * decides, falling back to the away team, so a cross-league game lands in one
 * section rather than both.
 */
function gameLeague(home: Team, away: Team): "MHSAA" | "MAIS" {
  return leagueOf(home.classification ?? away.classification);
}

/** "MAIS 4A · 1–0" — the meta line under each team name. */
export function upsetMetaLine(team: Team, classificationLabel: (c: string) => string): string {
  return `${classificationLabel(team.classification)} · ${team.record.wins}–${team.record.losses}`;
}
