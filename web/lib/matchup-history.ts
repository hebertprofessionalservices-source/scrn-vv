import type { Team } from "./types";
import {
  buildSeries,
  careerMilestone,
  coachSummary,
  coachVsCoach,
  coachVsOpponent,
  type CoachSummary,
  type HistoryData,
  type SeriesSummary,
} from "./history";

export interface RecordWLT {
  wins: number;
  losses: number;
  ties: number;
}

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * MaxPreps coach fields are school-edited free text; reject blanks, entries
 * with digits, and entries that are really the school or mascot name.
 */
export function sanitizeCoachName(raw: string | null, teamName: string): string | null {
  const name = raw?.trim() ?? "";
  if (!name || /\d/.test(name)) return null;
  const n = normName(name);
  const t = normName(teamName);
  if (!n || t.includes(n) || n.includes(t)) return null;
  const mascot = (teamName.trim().split(/\s+/).pop() ?? "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  if (mascot.length > 3 && new RegExp(`\\b${mascot}\\b`, "i").test(name)) return null;
  return name;
}

/** Display name for a team's head coach: AFHS history first, then MaxPreps. */
export function coachDisplayName(
  summary: CoachSummary | null,
  team: Team,
): string | null {
  return summary?.name ?? sanitizeCoachName(team.headCoach, team.name);
}

export interface CoachView {
  teamName: string;
  /** MaxPreps coach name — always shown even without AFHS history. */
  fallbackName: string | null;
  summary: CoachSummary | null;
  vsOpponent: RecordWLT | null;
}

export interface MatchupHistoryView {
  coaches: [CoachView, CoachView];
  coachVsCoach: { aName: string; bName: string; aWins: number; bWins: number; ties: number } | null;
  series: SeriesSummary | null;
  /** e.g. "Chris Cutcliffe is chasing career win #200 (2 away)". */
  milestones: string[];
}

/** Everything the matchup page needs from AFHS history; nulls become n/a. */
export function buildMatchupHistory(
  history: HistoryData | null,
  away: Team,
  home: Team,
  latestSeason: number,
): MatchupHistoryView {
  const schoolA = history?.teamMap[away.id];
  const schoolB = history?.teamMap[home.id];

  const coachView = (team: Team, school?: string, opponent?: string): CoachView => {
    const summary =
      history && school ? coachSummary(history, school, latestSeason) : null;
    return {
      teamName: team.name,
      fallbackName: sanitizeCoachName(team.headCoach, team.name),
      summary,
      vsOpponent:
        history && school && opponent ? coachVsOpponent(history, school, opponent) : null,
    };
  };

  const milestones: string[] = [];
  for (const [team, school] of [
    [away, schoolA],
    [home, schoolB],
  ] as const) {
    if (!history || !school) continue;
    const c = coachSummary(history, school, latestSeason);
    if (!c) continue;
    const m = careerMilestone(c);
    if (m) {
      milestones.push(
        `${team.name}'s ${c.name} sits at ${c.career.wins} career wins — ${m.needed} away from #${m.target}`,
      );
    }
  }

  return {
    coaches: [coachView(away, schoolA, schoolB), coachView(home, schoolB, schoolA)],
    coachVsCoach:
      history && schoolA && schoolB ? coachVsCoach(history, schoolA, schoolB) : null,
    series:
      history && schoolA && schoolB ? buildSeries(history.games, schoolA, schoolB) : null,
    milestones,
  };
}

/** Team-page coach card data. */
export function teamCoachView(
  history: HistoryData | null,
  team: Team,
  latestSeason: number,
): CoachSummary | null {
  const school = history?.teamMap[team.id];
  if (!history || !school) return null;
  return coachSummary(history, school, latestSeason);
}

export function fmtWLT(r: RecordWLT): string {
  return r.ties > 0 ? `${r.wins}–${r.losses}–${r.ties}` : `${r.wins}–${r.losses}`;
}
