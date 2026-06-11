import type { Editorial, Game, Player, Team } from "./types";
import { displaySlug } from "./display-slug";
import { opponentAliasSlug } from "./team-format";

export interface RawDataset { teams: Team[]; players: Player[]; games: Game[]; }

export interface Dataset {
  teams: Team[];
  players: Player[];
  games: Game[];
  teamsById: Map<string, Team>;
  teamsBySlug: Map<string, Team>;
  /** Resolves canonical ids AND short MaxPreps schedule slugs ("pearl"). */
  teamsByAlias: Map<string, Team>;
  playersById: Map<string, Player>;
  playersByTeam: Map<string, Player[]>;
  gamesByTeam: Map<string, Game[]>;
  gamesById: Map<string, Game>;
  season: string;
}

export function buildDataset(raw: RawDataset, season = "2025-26"): Dataset {
  const teamsById = new Map<string, Team>();
  const teamsBySlug = new Map<string, Team>();
  const teamsByAlias = new Map<string, Team>();
  const ambiguousAliases = new Set<string>();
  for (const t of raw.teams) {
    teamsById.set(t.id, t);
    teamsBySlug.set(displaySlug(t), t);
    const alias = opponentAliasSlug(t);
    if (teamsByAlias.has(alias) && teamsByAlias.get(alias)?.id !== t.id) {
      ambiguousAliases.add(alias);
    } else {
      teamsByAlias.set(alias, t);
    }
  }
  for (const alias of ambiguousAliases) teamsByAlias.delete(alias);
  for (const t of raw.teams) teamsByAlias.set(t.id, t);
  const playersById = new Map<string, Player>();
  const playersByTeam = new Map<string, Player[]>();
  for (const p of raw.players) {
    playersById.set(p.id, p);
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }

  // Each game was scraped from both teams' schedules, so most contests
  // appear twice (with the opponent as a short slug in one and a canonical
  // id in the other). Merge duplicates by MaxPreps contest key.
  const groups = new Map<string, Game[]>();
  const groupOrder: string[] = [];
  for (const g of raw.games) {
    const key = contestKey(g) ?? `id:${g.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(g);
  }

  const games: Game[] = [];
  const gamesById = new Map<string, Game>();
  for (const key of groupOrder) {
    const group = groups.get(key)!;
    let merged = group[0];
    for (let i = 1; i < group.length; i++) {
      merged = mergeDuplicateGame(merged, group[i], teamsById);
    }
    games.push(merged);
    // Every original id (including discarded duplicates) resolves to the
    // merged record so stored references like editorial gameId keep working.
    for (const g of group) gamesById.set(g.id, merged);
  }

  const gamesByTeam = new Map<string, Game[]>();
  for (const g of games) {
    for (const tid of [g.homeTeamId, g.awayTeamId]) {
      const list = gamesByTeam.get(tid) ?? [];
      list.push(g);
      gamesByTeam.set(tid, list);
    }
  }
  return {
    teams: raw.teams, players: raw.players, games,
    teamsById, teamsBySlug, teamsByAlias, playersById, playersByTeam,
    gamesByTeam, gamesById, season,
  };
}

function contestKey(g: Game): string | null {
  const m = (g.maxprepsUrl ?? "").match(/[?&]c=([\w-]+)/);
  return m ? m[1] : null;
}

function mergeDuplicateGame(
  a: Game,
  b: Game,
  teamsById: Map<string, Team>,
): Game {
  const canonical = (x: string, y: string) =>
    teamsById.has(x) ? x : teamsById.has(y) ? y : x;
  return {
    ...a,
    homeTeamId: canonical(a.homeTeamId, b.homeTeamId),
    awayTeamId: canonical(a.awayTeamId, b.awayTeamId),
    homeScore: a.homeScore ?? b.homeScore,
    awayScore: a.awayScore ?? b.awayScore,
    status: a.status === "final" || b.status === "final" ? "final" : a.status,
    venue: a.venue ?? b.venue,
    boxScore: a.boxScore ?? b.boxScore,
    maxprepsUrl: a.maxprepsUrl ?? b.maxprepsUrl,
  };
}
