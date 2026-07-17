import type { Dataset } from "./data";
import type { Game, Team } from "./types";
import { playoffOddsForGame } from "./standings";
import { classificationLabel } from "./team-format";
import { formatGameDate } from "./format-date";

/**
 * Computed matchup storylines — every bullet is derived from real data
 * (streaks, standings, conditioned playoff simulations). Facts that would
 * need unavailable data are omitted rather than invented.
 */
export function buildStorylines(
  data: Dataset,
  away: Team,
  home: Team,
  h2h: Game[],
  today = new Date(),
): string[] {
  const lines: string[] = [];

  // Playoff implications, conditioned on this game's outcome.
  const odds = playoffOddsForGame(data, away.id, home.id, today);
  if (odds) {
    for (const t of [away, home]) {
      const win = (t.id === odds.teamAId ? odds.ifTeamWins : odds.ifTeamLoses).get(t.id);
      const loss = (t.id === odds.teamAId ? odds.ifTeamLoses : odds.ifTeamWins).get(t.id);
      if (win !== undefined && loss !== undefined && win !== loss) {
        lines.push(
          `With a win, ${t.name}'s playoff chances rise to ${win}% — with a loss they fall to ${loss}%`,
        );
      }
    }
  }

  // Sole possession of first place in the region.
  if (away.district && away.district === home.district) {
    const rivals = data.teams.filter((t) => t.district === away.district);
    const best = Math.max(...rivals.map((t) => regionPct(t)));
    const leaders = rivals.filter((t) => regionPct(t) === best);
    if (
      leaders.length === 2 &&
      leaders.some((t) => t.id === away.id) &&
      leaders.some((t) => t.id === home.id) &&
      odds // only meaningful while the season is live
    ) {
      lines.push(`Winner takes sole possession of first place in ${away.district}`);
    }
  }

  // Streaks.
  for (const t of [away, home]) {
    if (t.streak && t.streak.count >= 3) {
      lines.push(
        t.streak.result === "W"
          ? `${t.name} ${pastSeason(today, data) ? "closed the season on" : "has won"} ${t.streak.count} in a row`
          : `${t.name} ${pastSeason(today, data) ? "ended the season on" : "has dropped"} ${t.streak.count} straight`,
      );
    }
    if (t.record.losses === 0 && t.record.wins >= 5) {
      lines.push(`${t.name} is a perfect ${t.record.wins}–0`);
    }
  }

  // Scoring superlatives within classification (top 3 only).
  for (const t of [away, home]) {
    const games = t.record.wins + t.record.losses;
    if (games === 0) continue;
    const classmates = data.teams.filter(
      (x) => x.classification === t.classification && x.record.wins + x.record.losses > 0,
    );
    const ppg = t.stats.pointsFor / games;
    const offRank =
      classmates.filter((x) => x.stats.pointsFor / (x.record.wins + x.record.losses) > ppg)
        .length + 1;
    if (offRank <= 3) {
      lines.push(
        `${t.name} averages ${ppg.toFixed(1)} PPG — #${offRank} in ${classificationLabel(t.classification)}`,
      );
    }
    const paG = t.stats.pointsAgainst / games;
    const defRank =
      classmates.filter(
        (x) => x.stats.pointsAgainst / (x.record.wins + x.record.losses) < paG,
      ).length + 1;
    if (defRank <= 3) {
      lines.push(
        `${t.name} allows just ${paG.toFixed(1)} PPG — #${defRank} defense in ${classificationLabel(t.classification)}`,
      );
    }
  }

  // Last meeting.
  const finals = h2h
    .filter((g) => g.status === "final" && g.homeScore !== null && g.awayScore !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const last = finals[0];
  if (last && last.homeScore !== last.awayScore) {
    const homeWon = last.homeScore! > last.awayScore!;
    const winnerId = homeWon ? last.homeTeamId : last.awayTeamId;
    const winner = winnerId === away.id ? away : winnerId === home.id ? home : null;
    if (winner) {
      const ws = Math.max(last.homeScore!, last.awayScore!);
      const ls = Math.min(last.homeScore!, last.awayScore!);
      lines.push(`${winner.name} took the last meeting ${ws}–${ls} (${formatGameDate(last.date)})`);
    }
  }

  return lines.slice(0, 7);
}

function regionPct(t: Team): number {
  const r = t.regionRecord;
  if (!r || r.wins + r.losses === 0) return 0;
  return r.wins / (r.wins + r.losses);
}

/** True when the dataset's last game is well in the past (offseason wording). */
function pastSeason(today: Date, data: Dataset): boolean {
  let last = "";
  for (const g of data.games) {
    if (g.date > last) last = g.date;
  }
  if (!last) return false;
  const cutoff = new Date(last.slice(0, 10));
  cutoff.setDate(cutoff.getDate() + 14);
  return today > cutoff;
}
