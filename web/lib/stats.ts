import type { Player, Position, Team } from "./types";

export function topPlayersByStat(
  players: Player[],
  position: Position,
  metric: (p: Player) => number,
  limit: number,
): Player[] {
  return players
    .filter((p) => p.position === position && metric(p) > 0)
    .sort((a, b) => metric(b) - metric(a))
    .slice(0, limit);
}

/**
 * Composite season impact score so offense, defense, and kickers can be
 * ranked on one list. Weights are rough point-equivalents per unit.
 */
export function playerImpactScore(p: Player): number {
  const s = p.stats;
  return (
    s.passing.yds +
    s.rushing.yds * 1.2 +
    s.receiving.yds * 1.2 +
    (s.passing.td + s.rushing.td + s.receiving.td) * 60 -
    s.passing.int * 30 +
    s.defense.tackles * 8 +
    s.defense.sacks * 50 +
    s.defense.int * 60 +
    s.defense.ff * 40 +
    s.kicking.fgm * 25 +
    s.kicking.xpm * 8
  );
}

export interface DefenseRank {
  team: Team;
  ppg: number;
}

export function topDefensesByPPG(teams: Team[], limit: number): DefenseRank[] {
  return teams
    .filter((t) => t.record.wins + t.record.losses > 0)
    .map<DefenseRank>((t) => ({
      team: t,
      ppg: t.stats.pointsAgainst / (t.record.wins + t.record.losses),
    }))
    .sort((a, b) => a.ppg - b.ppg)
    .slice(0, limit);
}

export function teamsByClass(teams: Team[]): Map<string, Team[]> {
  const out = new Map<string, Team[]>();
  for (const t of teams) {
    const list = out.get(t.classification) ?? [];
    list.push(t);
    out.set(t.classification, list);
  }
  return out;
}

/** True once we're well past the last game on the schedule. */
export function seasonConcluded<T extends { date: string }>(
  games: T[],
  today = new Date(),
): boolean {
  if (games.length === 0) return false;
  let last = "";
  for (const g of games) {
    if (g.date > last) last = g.date;
  }
  const GRACE_DAYS_AFTER_FINAL_GAME = 14;
  const cutoff = new Date(last);
  cutoff.setDate(cutoff.getDate() + GRACE_DAYS_AFTER_FINAL_GAME);
  return today > cutoff;
}

export function lastWeeksGames<T extends { date: string; status: string }>(
  games: T[],
  today = new Date(),
): T[] {
  const lastWeekEnd = new Date(today);
  lastWeekEnd.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
  return games.filter((g) => {
    if (g.status !== "final") return false;
    const d = new Date(g.date);
    return d >= lastWeekStart && d <= lastWeekEnd;
  });
}
