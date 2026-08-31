import { displaySlug } from "./display-slug";
import { formatGameDate } from "./format-date";
import { titleCaseSlug } from "./team-format";
import type { Game, Team } from "./types";

/**
 * A final flattened for the home page's score strip. The strip is filtered
 * client-side, so it ships as its own small payload rather than dragging the
 * whole team map across to the client.
 */
export interface ScoreCard {
  id: string;
  /** Matchup page, or null when a side can't be resolved to a team. */
  href: string | null;
  awayName: string;
  homeName: string;
  awayScore: number | null;
  homeScore: number | null;
  awayWin: boolean;
  /** Preformatted — "Fri, Aug 28". */
  date: string;
  /** Both sides, so the filter can match on either team. */
  classifications: string[];
}

export function buildScoreCards(games: Game[], teamsById: Map<string, Team>): ScoreCard[] {
  return games.map((g) => {
    const away = teamsById.get(g.awayTeamId);
    const home = teamsById.get(g.homeTeamId);
    return {
      id: g.id,
      href: away && home
        ? `/matchup/${displaySlug(away)}-vs-${displaySlug(home)}`
        : null,
      awayName: away?.name ?? titleCaseSlug(g.awayTeamId),
      homeName: home?.name ?? titleCaseSlug(g.homeTeamId),
      awayScore: g.awayScore ?? null,
      homeScore: g.homeScore ?? null,
      awayWin: (g.awayScore ?? 0) > (g.homeScore ?? 0),
      date: formatGameDate(g.date),
      classifications: [home?.classification, away?.classification].filter(
        (c) => Boolean(c),
      ) as string[],
    };
  });
}
