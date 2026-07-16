/**
 * Pure logic over the AFHS historical dataset (ahsfhs.org/mississippi):
 * all-time series between two schools and coach career records. Everything
 * returns null when the underlying history doesn't cover it — callers render
 * n/a, never a guess.
 */

export interface AfhsGame {
  team: string;
  year: number;
  date: string | null;
  opponent: string;
  loc: "home" | "away";
  teamScore: number;
  oppScore: number;
  result: "W" | "L" | "T";
  ot: string | null;
  district: boolean;
  playoff: string | null;
}

export interface CoachStint {
  team: string;
  coach: string;
  startYear: number;
  endYear: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface CoachPage {
  team: string;
  currentCoach: string | null;
  stints: CoachStint[];
}

export interface HistoryData {
  games: AfhsGame[];
  coachPages: CoachPage[];
  /** our teamId -> AFHS school name */
  teamMap: Record<string, string>;
}

export interface Meeting {
  year: number;
  date: string | null;
  aScore: number;
  bScore: number;
  /** AFHS school name of the host ("a" home game -> school A). */
  host: string;
  playoff: string | null;
}

export interface StreakInfo {
  school: string;
  count: number;
  startYear: number;
  endYear: number;
}

export interface SeriesSummary {
  schoolA: string;
  schoolB: string;
  aWins: number;
  bWins: number;
  ties: number;
  first: Meeting;
  last: Meeting;
  currentStreak: StreakInfo | null;
  longestStreak: StreakInfo | null;
  /** Most points either school ever allowed in the series. */
  mostAllowedByA: { points: number; year: number } | null;
  mostAllowedByB: { points: number; year: number } | null;
}

const normCache = new Map<string, string>();
function norm(s: string): string {
  let v = normCache.get(s);
  if (v === undefined) {
    v = s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    normCache.set(s, v);
  }
  return v;
}

/** All-time series between two AFHS schools, from school A's game log. */
export function buildSeries(
  games: AfhsGame[],
  schoolA: string,
  schoolB: string,
): SeriesSummary | null {
  const na = norm(schoolA);
  const nb = norm(schoolB);
  if (na === nb) return null;
  const meetings: Meeting[] = [];
  for (const g of games) {
    if (norm(g.team) !== na || norm(g.opponent) !== nb) continue;
    meetings.push({
      year: g.year,
      date: g.date,
      aScore: g.teamScore,
      bScore: g.oppScore,
      host: g.loc === "home" ? schoolA : schoolB,
      playoff: g.playoff,
    });
  }
  if (meetings.length === 0) return null;
  // Page order within a season is chronological; sort seasons, keep order.
  meetings.sort((x, y) => x.year - y.year);

  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const m of meetings) {
    if (m.aScore > m.bScore) aWins++;
    else if (m.bScore > m.aScore) bWins++;
    else ties++;
  }

  // Streaks (ties break streaks but start none).
  let current: StreakInfo | null = null;
  let longest: StreakInfo | null = null;
  for (const m of meetings) {
    const winner = m.aScore > m.bScore ? schoolA : m.bScore > m.aScore ? schoolB : null;
    if (winner === null) {
      current = null;
      continue;
    }
    const next: StreakInfo =
      current && current.school === winner
        ? { school: winner, count: current.count + 1, startYear: current.startYear, endYear: m.year }
        : { school: winner, count: 1, startYear: m.year, endYear: m.year };
    current = next;
    if (!longest || next.count > longest.count) longest = { ...next };
  }

  const most = (score: (m: Meeting) => number) =>
    meetings.reduce<{ points: number; year: number } | null>(
      (best, m) => (best === null || score(m) > best.points ? { points: score(m), year: m.year } : best),
      null,
    );

  return {
    schoolA,
    schoolB,
    aWins,
    bWins,
    ties,
    first: meetings[0],
    last: meetings[meetings.length - 1],
    currentStreak: current,
    longestStreak: longest,
    mostAllowedByA: most((m) => m.bScore),
    mostAllowedByB: most((m) => m.aScore),
  };
}

export interface CoachSummary {
  name: string;
  /** Completed seasons at this school (capped at the latest played season). */
  yearsAtSchool: number;
  atSchool: { wins: number; losses: number; ties: number };
  /** Career across every Mississippi school in AFHS records. */
  career: { wins: number; losses: number; ties: number };
}

/** The school's current coach with tenure + records; null when unknown. */
export function coachSummary(
  history: Pick<HistoryData, "coachPages" | "games">,
  school: string,
  latestSeason: number,
): CoachSummary | null {
  const page = history.coachPages.find((p) => norm(p.team) === norm(school));
  const name = page?.currentCoach;
  if (!page || !name) return null;

  const mine = page.stints.filter((s) => norm(s.coach) === norm(name));
  if (mine.length === 0) return null;
  let years = 0;
  const atSchool = { wins: 0, losses: 0, ties: 0 };
  for (const s of mine) {
    years += Math.max(0, Math.min(s.endYear, latestSeason) - s.startYear + 1);
    atSchool.wins += s.wins;
    atSchool.losses += s.losses;
    atSchool.ties += s.ties;
  }

  const career = { wins: 0, losses: 0, ties: 0 };
  for (const p of history.coachPages) {
    for (const s of p.stints) {
      if (norm(s.coach) !== norm(name)) continue;
      career.wins += s.wins;
      career.losses += s.losses;
      career.ties += s.ties;
    }
  }

  return { name, yearsAtSchool: years, atSchool, career };
}

/** Coach's record against one opponent — meetings during their stints. */
export function coachVsOpponent(
  history: Pick<HistoryData, "coachPages" | "games">,
  school: string,
  opponent: string,
): { wins: number; losses: number; ties: number } | null {
  const page = history.coachPages.find((p) => norm(p.team) === norm(school));
  const name = page?.currentCoach;
  if (!page || !name) return null;
  const stints = page.stints.filter((s) => norm(s.coach) === norm(name));
  if (stints.length === 0) return null;

  const inTenure = (year: number) =>
    stints.some((s) => year >= s.startYear && year <= s.endYear);
  const rec = { wins: 0, losses: 0, ties: 0 };
  let found = false;
  for (const g of history.games) {
    if (norm(g.team) !== norm(school) || norm(g.opponent) !== norm(opponent)) continue;
    if (!inTenure(g.year)) continue;
    found = true;
    if (g.result === "W") rec.wins++;
    else if (g.result === "L") rec.losses++;
    else rec.ties++;
  }
  return found ? rec : { wins: 0, losses: 0, ties: 0 };
}

/** Head-to-head between the two schools' current coaches. */
export function coachVsCoach(
  history: Pick<HistoryData, "coachPages" | "games">,
  schoolA: string,
  schoolB: string,
): { aName: string; bName: string; aWins: number; bWins: number; ties: number } | null {
  const pageA = history.coachPages.find((p) => norm(p.team) === norm(schoolA));
  const pageB = history.coachPages.find((p) => norm(p.team) === norm(schoolB));
  if (!pageA?.currentCoach || !pageB?.currentCoach) return null;
  const stintsA = pageA.stints.filter((s) => norm(s.coach) === norm(pageA.currentCoach!));
  const stintsB = pageB.stints.filter((s) => norm(s.coach) === norm(pageB.currentCoach!));
  if (stintsA.length === 0 || stintsB.length === 0) return null;

  const inA = (y: number) => stintsA.some((s) => y >= s.startYear && y <= s.endYear);
  const inB = (y: number) => stintsB.some((s) => y >= s.startYear && y <= s.endYear);
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const g of history.games) {
    if (norm(g.team) !== norm(schoolA) || norm(g.opponent) !== norm(schoolB)) continue;
    if (!inA(g.year) || !inB(g.year)) continue;
    if (g.result === "W") aWins++;
    else if (g.result === "L") bWins++;
    else ties++;
  }
  return { aName: pageA.currentCoach, bName: pageB.currentCoach, aWins, bWins, ties };
}

/** Upcoming round-number career milestone within reach (e.g. 200th win). */
export function careerMilestone(c: CoachSummary): { target: number; needed: number } | null {
  const next = Math.ceil((c.career.wins + 1) / 100) * 100;
  const needed = next - c.career.wins;
  return needed <= 3 ? { target: next, needed } : null;
}
