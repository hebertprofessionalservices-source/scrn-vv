import type { Dataset } from "./data";
import type { Player, Team } from "./types";

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

const hasAny = (s: SideLeaders) => s.offense.length + s.defense.length > 0;

/**
 * Key Players for a matchup: each side's current-season stat leaders.
 *
 * This was briefly narrowed to the head-to-head game's own box score, which
 * blanked the section on any matchup that had not been played. The client
 * wants it back on 2026 season stats (Sep 2 2026) — the same numbers the team
 * page shows. Nothing reaches into last season; null means neither side has
 * published stats yet, and the section is dropped.
 */
export function matchupKeyLeaders(
  data: Dataset,
  away: Team,
  home: Team,
): MatchupLeaders | null {
  const leaders = {
    away: leadersFor(data.playersByTeam.get(away.id) ?? []),
    home: leadersFor(data.playersByTeam.get(home.id) ?? []),
  };
  return hasAny(leaders.away) || hasAny(leaders.home) ? leaders : null;
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
