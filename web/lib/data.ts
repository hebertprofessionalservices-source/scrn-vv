import type { Editorial, Game, Player, Team } from "./types";
import { displaySlug } from "./display-slug";

export interface RawDataset { teams: Team[]; players: Player[]; games: Game[]; }

export interface Dataset {
  teams: Team[];
  players: Player[];
  games: Game[];
  teamsById: Map<string, Team>;
  teamsBySlug: Map<string, Team>;
  playersById: Map<string, Player>;
  playersByTeam: Map<string, Player[]>;
  gamesByTeam: Map<string, Game[]>;
  gamesById: Map<string, Game>;
  season: string;
}

export function buildDataset(raw: RawDataset, season = "2025-26"): Dataset {
  const teamsById = new Map<string, Team>();
  const teamsBySlug = new Map<string, Team>();
  for (const t of raw.teams) {
    teamsById.set(t.id, t);
    teamsBySlug.set(displaySlug(t), t);
  }
  const playersById = new Map<string, Player>();
  const playersByTeam = new Map<string, Player[]>();
  for (const p of raw.players) {
    playersById.set(p.id, p);
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }
  const gamesByTeam = new Map<string, Game[]>();
  const gamesById = new Map<string, Game>();
  for (const g of raw.games) {
    gamesById.set(g.id, g);
    for (const tid of [g.homeTeamId, g.awayTeamId]) {
      const list = gamesByTeam.get(tid) ?? [];
      list.push(g);
      gamesByTeam.set(tid, list);
    }
  }
  return {
    teams: raw.teams, players: raw.players, games: raw.games,
    teamsById, teamsBySlug, playersById, playersByTeam,
    gamesByTeam, gamesById, season,
  };
}
