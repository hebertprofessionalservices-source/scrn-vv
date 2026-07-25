import type { Game, Player, Team } from "./types";
import { buildDataset } from "./data";
import { buildPowerRankings, type PowerRank } from "./power";
import {
  keyReturnersByTeam,
  returningOffenseShares,
  returningShares,
  type KeyReturner,
} from "./returning";

export interface PriorSeasonInfo {
  season: string;
  /** Final power ranks of the previous season (undiscounted). */
  power: Map<string, PowerRank>;
  /** teamId -> returning-production share (0..1), null when unknown. */
  returning: Map<string, number | null>;
  /** teamId -> returning OFFENSIVE yardage share (0..1), null when unknown. */
  returningOffense: Map<string, number | null>;
  /** teamId -> top returning stat leaders from the previous season. */
  keyReturners: Map<string, KeyReturner[]>;
  /** teamId -> previous season's final MaxPreps pool rank (MHSAA: state
   *  overall; MAIS: class — their pools aren't comparable). */
  stateRanks: Map<string, number>;
  /** teamId -> returning (non-senior) players, class promoted, prior stats. */
  returningPlayers: Map<string, Player[]>;
}

/** "2026-27" -> "2025-26". */
export function previousSeason(season: string): string {
  const y = Number(season.slice(0, 4)) - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

const PROMOTED_CLASS: Record<string, Player["class"]> = {
  FR: "SO",
  SO: "JR",
  JR: "SR",
};

/** Assemble prior-season context from that season's raw data files. */
export function buildPriorSeasonInfo(
  prevSeason: string,
  teams: Team[],
  players: Player[],
  games: Game[],
): PriorSeasonInfo | null {
  if (teams.length === 0 || games.length === 0) return null;
  const power = buildPowerRankings(buildDataset({ teams, players: [], games }, prevSeason));
  if (power.size === 0) return null;

  const stateRanks = new Map<string, number>();
  for (const t of teams) {
    const rank = t.classification.startsWith("MAIS")
      ? t.rankings.stateClass
      : t.rankings.stateOverall;
    if (rank !== null) stateRanks.set(t.id, rank);
  }
  const returningPlayers = new Map<string, Player[]>();
  for (const p of players) {
    if (p.class === "SR") continue;
    const list = returningPlayers.get(p.teamId) ?? [];
    list.push({ ...p, class: PROMOTED_CLASS[p.class] ?? p.class });
    returningPlayers.set(p.teamId, list);
  }
  return {
    season: prevSeason,
    power,
    returning: returningShares(players),
    returningOffense: returningOffenseShares(players),
    keyReturners: keyReturnersByTeam(players),
    stateRanks,
    returningPlayers,
  };
}
