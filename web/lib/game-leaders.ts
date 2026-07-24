import type { Dataset } from "./data";
import type { Game, Player, Team } from "./types";
import { gameStatLines, type RawLine } from "./weekly";

/** One entry in a Key Players card. */
export interface StatLeader {
  player: Player;
  role: string;
  line: string;
}

export interface SideLeaders {
  offense: StatLeader[];
  defense: StatLeader[];
}

export interface MatchupLeaders {
  away: SideLeaders;
  home: SideLeaders;
  /** "game" → stats from the concluded matchup; otherwise a projection. */
  mode: "game" | "season" | "returning";
}

/** Season stat leaders from a roster (current or returning players). */
export function leadersFor(players: Player[]): SideLeaders {
  const top = (metric: (p: Player) => number) =>
    players.reduce<Player | null>(
      (best, p) => (metric(p) > (best ? metric(best) : 0) ? p : best),
      null,
    );

  const offense: StatLeader[] = [];
  const qb = top((p) => p.stats.passing.yds);
  if (qb) {
    const s = qb.stats.passing;
    offense.push({
      player: qb,
      role: "QB",
      line: `${s.yds.toLocaleString()} YDS · ${s.td} TD · ${s.int} INT · ${s.rating.toFixed(1)} RAT`,
    });
  }
  const rb = top((p) => p.stats.rushing.yds);
  if (rb) {
    const s = rb.stats.rushing;
    offense.push({
      player: rb,
      role: "RB",
      line: `${s.yds.toLocaleString()} YDS · ${s.td} TD · ${s.ypc.toFixed(1)} YPC`,
    });
  }
  const wr = top((p) => p.stats.receiving.yds);
  if (wr) {
    const s = wr.stats.receiving;
    offense.push({
      player: wr,
      role: "WR",
      line: `${s.rec} REC · ${s.yds.toLocaleString()} YDS · ${s.td} TD`,
    });
  }

  const defense: StatLeader[] = [];
  const tackler = top((p) => p.stats.defense.tackles);
  if (tackler) {
    const s = tackler.stats.defense;
    defense.push({
      player: tackler,
      role: tackler.position,
      line: `${s.tackles} TKL · ${s.sacks} SACK · ${s.int} INT`,
    });
  }
  const rusher = top((p) => p.stats.defense.sacks);
  if (rusher && rusher.id !== tackler?.id && rusher.stats.defense.sacks >= 3) {
    const s = rusher.stats.defense;
    defense.push({
      player: rusher,
      role: rusher.position,
      line: `${s.sacks} SACK · ${s.tackles} TKL · ${s.ff} FF`,
    });
  }
  return { offense, defense };
}

/** Leaders of one side of a played game, from attributed box-score lines. */
function gameSideLeaders(lines: RawLine[]): SideLeaders {
  const top = (metric: (l: RawLine) => number) =>
    lines.reduce<RawLine | null>(
      (best, l) => (metric(l) > (best ? metric(best) : 0) ? l : best),
      null,
    );

  const offense: StatLeader[] = [];
  const qb = top((l) => l.passYds);
  if (qb) {
    offense.push({
      player: qb.player,
      role: "QB",
      line: `${qb.passYds.toLocaleString()} YDS · ${qb.passTd} TD · ${qb.passInt} INT`,
    });
  }
  const rb = top((l) => l.rushYds);
  if (rb) {
    offense.push({
      player: rb.player,
      role: "RB",
      line: `${rb.rushYds.toLocaleString()} YDS · ${rb.rushTd} TD`,
    });
  }
  const wr = top((l) => l.recYds);
  if (wr) {
    offense.push({
      player: wr.player,
      role: "WR",
      line: `${wr.rec} REC · ${wr.recYds.toLocaleString()} YDS · ${wr.recTd} TD`,
    });
  }

  const defense: StatLeader[] = [];
  const tackler = top((l) => l.tackles);
  if (tackler) {
    defense.push({
      player: tackler.player,
      role: tackler.player.position,
      line: `${tackler.tackles} TKL · ${tackler.sacks} SACK · ${tackler.defInt} INT`,
    });
  }
  const rusher = top((l) => l.sacks);
  if (rusher && rusher.player.id !== tackler?.player.id && rusher.sacks >= 2) {
    defense.push({
      player: rusher.player,
      role: rusher.player.position,
      line: `${rusher.sacks} SACK · ${rusher.tackles} TKL · ${rusher.ff} FF`,
    });
  }
  return { offense, defense };
}

const hasAny = (s: SideLeaders) => s.offense.length + s.defense.length > 0;

/**
 * Key Players for a matchup:
 * 1. Once the head-to-head game has concluded (box score in), the leaders
 *    FROM THAT GAME.
 * 2. Before then, the projected impact players — current-season stat
 *    leaders, or last season's returning leaders while stats are empty.
 */
export function matchupKeyLeaders(
  data: Dataset,
  away: Team,
  home: Team,
  h2h: Game[],
  returningPlayers: Map<string, Player[]> | null,
): MatchupLeaders {
  const finals = h2h
    .filter((g) => g.status === "final" && g.boxScore)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const g of finals) {
    const lines = gameStatLines(data, g);
    if (lines.length === 0) continue;
    return {
      mode: "game",
      away: gameSideLeaders(lines.filter((l) => l.team.id === away.id)),
      home: gameSideLeaders(lines.filter((l) => l.team.id === home.id)),
    };
  }

  const seasonAway = leadersFor(data.playersByTeam.get(away.id) ?? []);
  const seasonHome = leadersFor(data.playersByTeam.get(home.id) ?? []);
  if (hasAny(seasonAway) || hasAny(seasonHome)) {
    return { mode: "season", away: seasonAway, home: seasonHome };
  }

  return {
    mode: "returning",
    away: leadersFor(returningPlayers?.get(away.id) ?? []),
    home: leadersFor(returningPlayers?.get(home.id) ?? []),
  };
}

/** Team-page variant: current season leaders, else returning projection. */
export function teamKeyLeaders(
  players: Player[],
  returning: Player[] | null,
): SideLeaders {
  const season = leadersFor(players);
  if (hasAny(season)) return season;
  return leadersFor(returning ?? []);
}
