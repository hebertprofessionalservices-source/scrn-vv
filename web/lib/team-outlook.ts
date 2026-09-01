import type { Dataset } from "./data";
import type { Game, Team } from "./types";
import {
  teamRecordSplits,
  winProbability,
  type Rate,
  type RecordWL,
} from "./standings";
import type { TeamEfficiency } from "./efficiency";
import type { RunPassSplit } from "./run-pass";
import type { RecordsBlockInput } from "./matchup-format";

export interface RegionStanding {
  record: RecordWL;
  place: number;
  size: number;
}

/** Where the team sits in its region standings (same sort as buildStandings). */
export function regionStanding(data: Dataset, team: Team): RegionStanding | null {
  if (!team.district) return null;
  const rivals = data.teams.filter(
    (t) => t.district === team.district && t.classification === team.classification,
  );
  const recs = new Map(
    rivals.map((t) => [t.id, teamRecordSplits(data, t).region] as const),
  );
  const pct = (r: RecordWL) => (r.wins + r.losses === 0 ? 0 : r.wins / (r.wins + r.losses));
  const overallPct = (t: Team) =>
    t.record.wins + t.record.losses === 0
      ? 0
      : t.record.wins / (t.record.wins + t.record.losses);
  const ordered = [...rivals].sort(
    (a, b) =>
      pct(recs.get(b.id)!) - pct(recs.get(a.id)!) ||
      recs.get(b.id)!.wins - recs.get(a.id)!.wins ||
      overallPct(b) - overallPct(a) ||
      a.name.localeCompare(b.name),
  );
  const place = ordered.findIndex((t) => t.id === team.id) + 1;
  if (place === 0) return null;
  return { record: recs.get(team.id)!, place, size: rivals.length };
}

export interface SosInfo {
  /** Average power rating of opponents already played; null → none rated. */
  played: number | null;
  /** Average power rating of remaining scheduled opponents. */
  remaining: number | null;
}

/** Strength of schedule from the global rating pool. */
export function strengthOfSchedule(data: Dataset, team: Team, rate: Rate): SosInfo {
  const played: number[] = [];
  const remaining: number[] = [];
  for (const g of data.gamesByTeam.get(team.id) ?? []) {
    const oppRaw = g.homeTeamId === team.id ? g.awayTeamId : g.homeTeamId;
    const opp = data.teamsByAlias.get(oppRaw);
    if (!opp || opp.id === team.id) continue;
    if (g.status === "final" && g.homeScore !== null && g.awayScore !== null) {
      played.push(rate(opp.id));
    } else if (g.status === "scheduled") {
      remaining.push(rate(opp.id));
    }
  }
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  return { played: avg(played), remaining: avg(remaining) };
}

/** The team's next unplayed game, with the opponent resolved. */
export function nextScheduledGame(
  data: Dataset,
  team: Team,
  today = new Date(),
): { game: Game; opp: Team; isHome: boolean } | null {
  const todayKey = today.toISOString().slice(0, 10);
  const upcoming = (data.gamesByTeam.get(team.id) ?? [])
    .filter((g) => g.status === "scheduled" && g.date.slice(0, 10) >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const game of upcoming) {
    const isHome = game.homeTeamId === team.id;
    const opp = data.teamsByAlias.get(isHome ? game.awayTeamId : game.homeTeamId);
    if (opp && opp.id !== team.id) return { game, opp, isHome };
  }
  return null;
}

/** Everything one side of a matchup comparison displays (serializable). */
export interface MatchupSideData {
  records: RecordsBlockInput;
  /** Yards per rush / pass attempt; null without print stats or attempts. */
  avgRush: number | null;
  avgPass: number | null;
  offEff: number | null;
  defEff: number | null;
  sosPlayed: number | null;
  sosRemaining: number | null;
}

export function buildMatchupSide(
  data: Dataset,
  team: Team,
  ctx: {
    rate: Rate;
    efficiency: TeamEfficiency | null;
    runPass: RunPassSplit | null;
  },
): MatchupSideData {
  const splits = teamRecordSplits(data, team);
  const standing = regionStanding(data, team);
  const sos = strengthOfSchedule(data, team, ctx.rate);
  const hasPrint = team.stats.yardsFor > 0;
  return {
    records: {
      overall: team.record,
      classification: splits.classification,
      region: standing ? { record: standing.record, place: standing.place } : null,
      home: team.homeRecord ?? null,
      away: team.awayRecord ?? null,
      neutral: team.neutralRecord ?? null,
    },
    avgRush:
      hasPrint && ctx.runPass && ctx.runPass.rush > 0
        ? team.stats.rushYdsFor / ctx.runPass.rush
        : null,
    avgPass:
      hasPrint && ctx.runPass && ctx.runPass.pass > 0
        ? team.stats.passYdsFor / ctx.runPass.pass
        : null,
    offEff: ctx.efficiency?.offIndex ?? null,
    defEff: ctx.efficiency?.defIndex ?? null,
    sosPlayed: sos.played,
    sosRemaining: sos.remaining,
  };
}

/** Win probability for one game from a team's perspective; null when the
 *  opponent can't be resolved to a rated team. */
export function gameWinProbability(
  data: Dataset,
  team: Team,
  game: Game,
  rate: Rate,
): number | null {
  const oppRaw = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
  const opp = data.teamsByAlias.get(oppRaw);
  if (!opp || opp.id === team.id) return null;
  return winProbability(rate, team.id, opp.id);
}
