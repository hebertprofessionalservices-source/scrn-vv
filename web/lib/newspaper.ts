import type { Dataset } from "./data";
import type { PowerRank } from "./power";
import type { BoxScoreEntry, Game, Team } from "./types";

/**
 * Assembles a week's results for one classification into the blocks a
 * newspaper-style recap page prints: headline games, a ranked scoreboard,
 * standout individual performances, and short notebook items.
 *
 * Everything here is derived from scraped data — no prose is invented. A
 * caption that cannot be supported by a stat line is simply not produced.
 */

/** One contest, deduplicated from the paired rows games.json stores. */
export interface Contest {
  game: Game;
  home: Team | null;
  away: Team | null;
  homeName: string;
  awayName: string;
  /** Mascot-free forms, the way a newspaper prints them ("Ocean Springs"). */
  homeSchool: string;
  awaySchool: string;
  winnerSchool: string;
  loserSchool: string;
  /**
   * Crest for each side. Out-of-state opponents are not in teams.json but do
   * have logos registered under their schedule slug, so resolve through that
   * too — otherwise a real school like Collierville renders as a blank disc.
   */
  homeLogo: string | null;
  awayLogo: string | null;
  winnerLogo: string | null;
  loserLogo: string | null;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "tie";
  winnerName: string;
  loserName: string;
  winnerTeam: Team | null;
  loserTeam: Team | null;
  winnerScore: number;
  loserScore: number;
  margin: number;
  /** Class rank of each side entering the week, when ranked. */
  homeRank: number | null;
  awayRank: number | null;
  winnerRank: number | null;
  loserRank: number | null;
  /** Periods beyond the fourth mean overtime. */
  overtime: boolean;
  quarters: { home: number[]; away: number[] } | null;
}

export interface Performance {
  name: string;
  teamName: string;
  /** teamName without the mascot, for captions that read as prose. */
  school: string;
  team: Team | null;
  logo: string | null;
  line: string;
  /** Sort key; larger is more notable. */
  weight: number;
}

export interface NotebookItem {
  team: Team | null;
  logo: string | null;
  label: string;
  text: string;
}

export interface Newspaper {
  contests: Contest[];
  headliners: Contest[];
  scoreboard: Contest[];
  performances: Performance[];
  notebook: NotebookItem[];
}

/**
 * "Ocean Springs Greyhounds" -> "Ocean Springs".
 *
 * Scoreboards and headlines print the school, not the mascot — it is how a
 * sports page reads, and it keeps long MAIS names ("St. Joseph Catholic
 * Bruins") from wrapping a fixed-height page past its bottom edge.
 */
function schoolName(team: Team | null, fallback: string): string {
  if (!team) return fallback;
  const { name, mascot } = team;
  if (mascot && name.toLowerCase().endsWith(mascot.toLowerCase())) {
    const trimmed = name.slice(0, name.length - mascot.length).trim();
    if (trimmed) return trimmed;
  }
  return name;
}

/** A team-name-shaped fallback for opponents that aren't in teams.json. */
function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Collapse the paired rows for a contest into one.
 *
 * games.json stores each contest twice — once from each team's schedule
 * scrape — so a naive pass double-counts every game. The MaxPreps contest URL
 * is the stable identity; when it is missing, the date plus the two resolved
 * team ids is.
 */
function contestKey(g: Game, data: Dataset): string {
  if (g.maxprepsUrl) return g.maxprepsUrl;
  const ids = [g.homeTeamId, g.awayTeamId]
    .map((t) => data.teamsByAlias.get(t)?.id ?? t)
    .sort()
    .join("|");
  return `${g.date}|${ids}`;
}

function toContest(
  g: Game,
  data: Dataset,
  ranks: Map<string, PowerRank>,
  classification: string,
): Contest | null {
  if (g.homeScore === null || g.awayScore === null) return null;
  const home = data.teamsByAlias.get(g.homeTeamId) ?? null;
  const away = data.teamsByAlias.get(g.awayTeamId) ?? null;
  const homeName = home?.name ?? prettifySlug(g.homeTeamId);
  const awayName = away?.name ?? prettifySlug(g.awayTeamId);
  /**
   * classRank is a rank WITHIN a classification, so it is only meaningful on
   * a page about that classification. Printing a 6A team's "No. 2" beside 7A
   * teams reads as a 7A ranking and is simply wrong, so out-of-class teams
   * carry no rank here even though the power model has one for them.
   */
  const rankOf = (t: Team | null) =>
    t && t.classification === classification ? ranks.get(t.id)?.classRank ?? null : null;
  const homeRank = rankOf(home);
  const awayRank = rankOf(away);
  const winner =
    g.homeScore === g.awayScore ? "tie" : g.homeScore > g.awayScore ? "home" : "away";
  const homeWon = winner === "home";
  const homeSchool = schoolName(home, homeName);
  const awaySchool = schoolName(away, awayName);
  const logoFor = (t: Team | null, slug: string) =>
    t?.logoUrl ?? data.opponentLogos.get(slug) ?? null;
  const homeLogo = logoFor(home, g.homeTeamId);
  const awayLogo = logoFor(away, g.awayTeamId);
  const q = g.quarterScores;
  const hasQuarters = !!q && q.home.length > 0 && q.home.length === q.away.length;
  return {
    game: g,
    home,
    away,
    homeName,
    awayName,
    homeSchool,
    awaySchool,
    winnerSchool: homeWon ? homeSchool : awaySchool,
    loserSchool: homeWon ? awaySchool : homeSchool,
    homeLogo,
    awayLogo,
    winnerLogo: homeWon ? homeLogo : awayLogo,
    loserLogo: homeWon ? awayLogo : homeLogo,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    winner,
    winnerName: homeWon ? homeName : awayName,
    loserName: homeWon ? awayName : homeName,
    winnerTeam: homeWon ? home : away,
    loserTeam: homeWon ? away : home,
    winnerScore: Math.max(g.homeScore, g.awayScore),
    loserScore: Math.min(g.homeScore, g.awayScore),
    margin: Math.abs(g.homeScore - g.awayScore),
    homeRank,
    awayRank,
    winnerRank: homeWon ? homeRank : awayRank,
    loserRank: homeWon ? awayRank : homeRank,
    overtime: hasQuarters && q.home.length > 4,
    quarters: hasQuarters ? { home: q.home, away: q.away } : null,
  };
}

/**
 * How much a result deserves the front page.
 *
 * Ranked upsets lead, then one-score games between ranked teams, then routs
 * of ranked teams. An unranked-vs-unranked blowout scores near zero however
 * lopsided it was — nobody leads the section with it.
 */
function newsworthiness(c: Contest): number {
  let score = 0;
  if (c.winnerRank !== null && c.loserRank !== null) {
    // Beating a better-ranked team; the bigger the gap, the bigger the story.
    if (c.winnerRank > c.loserRank) score += 40 + (c.winnerRank - c.loserRank) * 2;
    else score += 10;
    if (c.margin <= 3) score += 25;
    else if (c.margin <= 7) score += 12;
    if (c.margin >= 28) score += 15;
  } else if (c.loserRank !== null) {
    // An unranked team beat a ranked one.
    score += 45 + Math.max(0, 20 - c.loserRank);
    if (c.margin >= 21) score += 15;
  } else if (c.winnerRank !== null) {
    score += 8;
    if (c.winnerRank <= 5 && c.loserScore === 0) score += 6;
  }
  if (c.overtime) score += 10;
  return score;
}

function entryName(e: BoxScoreEntry): string {
  // playerId is stored as "D. Dean(Sr)" by the box score scraper.
  return e.playerId.replace(/\((Fr|So|Jr|Sr)\)$/, "").trim();
}

function entryClass(e: BoxScoreEntry): string {
  const m = e.playerId.match(/\((Fr|So|Jr|Sr)\)$/);
  return m ? m[1].toUpperCase() : "";
}

/**
 * Pull the loudest stat lines out of a week's box scores.
 *
 * Box scores are entered by each team's own coach, so coverage is partial and
 * uneven; this ranks whatever exists rather than assuming every game has data.
 * A player is credited to the contest's winner or loser by which side's roster
 * carries the name, falling back to no team rather than guessing.
 */
function performances(
  contests: Contest[],
  data: Dataset,
  classification: string,
): Performance[] {
  const out: Performance[] = [];
  for (const c of contests) {
    const box = c.game.boxScore;
    if (!box) continue;
    // Only players from the page's own classification: a 7A recap should not
    // spotlight the 3A opponent who happened to play a 7A school.
    const sides = [c.home, c.away].filter(
      (t): t is Team => t !== null && t.classification === classification,
    );
    if (sides.length === 0) continue;
    const findTeam = (name: string): Team | null => {
      const last = name.replace(/\./g, " ").trim().split(/\s+/).pop()?.toLowerCase();
      if (!last) return null;
      for (const t of sides) {
        const roster = data.playersByTeam.get(t.id) ?? [];
        if (roster.some((p) => p.name.toLowerCase().split(/\s+/).pop() === last)) return t;
      }
      return null;
    };
    const add = (e: BoxScoreEntry, kind: "PASS" | "RUSH" | "REC") => {
      const yds = e.yds ?? 0;
      const td = e.td ?? 0;
      if (yds < 100 && td < 2) return;
      const name = entryName(e);
      const cls = entryClass(e);
      const team = findTeam(name);
      // Box scores hold both teams' players; without a roster match we cannot
      // say which side a line belongs to, and guessing would credit the wrong
      // school. Drop it rather than print an attribution we can't support.
      if (!team) return;
      const unit = kind === "PASS" ? "PASS YDS" : kind === "RUSH" ? "RUSH YDS" : "REC YDS";
      const parts = [`${yds} ${unit}`];
      if (td) parts.push(`${td} TD`);
      out.push({
        name: cls ? `${name} (${cls})` : name,
        teamName: team.name,
        school: schoolName(team, team.name),
        team,
        logo: team.logoUrl ?? null,
        line: parts.join(", "),
        weight: yds + td * 45,
      });
    };
    box.passing.forEach((e) => add(e, "PASS"));
    box.rushing.forEach((e) => add(e, "RUSH"));
    box.receiving.forEach((e) => add(e, "REC"));
  }
  return out.sort((a, b) => b.weight - a.weight);
}

function notebook(contests: Contest[]): NotebookItem[] {
  const items: NotebookItem[] = [];
  const shutout = contests
    .filter((c) => c.loserScore === 0 && c.winnerRank !== null)
    .sort((a, b) => (a.winnerRank ?? 99) - (b.winnerRank ?? 99))[0];
  if (shutout) {
    items.push({
      team: shutout.winnerTeam,
      logo: shutout.winnerLogo,
      label: `${shutout.winnerSchool.toUpperCase()} SHUTS THE DOOR`,
      text: `Blanks ${shutout.loserSchool} ${shutout.winnerScore}-0.`,
    });
  }
  const rout = [...contests].sort((a, b) => b.winnerScore - a.winnerScore)[0];
  if (rout) {
    items.push({
      team: rout.winnerTeam,
      logo: rout.winnerLogo,
      label: `${rout.winnerSchool.toUpperCase()} ERUPTS`,
      text: `Hangs ${rout.winnerScore} on ${rout.loserSchool}.`,
    });
  }
  const oneScore = contests
    .filter((c) => c.margin > 0 && c.margin <= 2)
    .sort((a, b) => a.margin - b.margin)[0];
  if (oneScore) {
    items.push({
      team: oneScore.winnerTeam,
      logo: oneScore.winnerLogo,
      label: `${oneScore.winnerSchool.toUpperCase()} BY ${oneScore.margin}`,
      text: `Edges ${oneScore.loserSchool} ${oneScore.winnerScore}-${oneScore.loserScore}.`,
    });
  }
  const ot = contests.find((c) => c.overtime);
  if (ot) {
    items.push({
      team: ot.winnerTeam,
      logo: ot.winnerLogo,
      label: "OVERTIME",
      text: `${ot.winnerSchool} outlasts ${ot.loserSchool} ${ot.winnerScore}-${ot.loserScore}.`,
    });
  }
  return items.slice(0, 4);
}

export type League = "MHSAA" | "MAIS";

export function leagueOf(classification: string): League {
  return classification.startsWith("MAIS") ? "MAIS" : "MHSAA";
}

/**
 * The date each league's Week 1 slate is played.
 *
 * The two leagues are NOT on the same count — MAIS opens two weeks earlier —
 * so an Aug 28 2026 game is MAIS Week 3 but MHSAA Week 1. Published graphics
 * must carry that league's own number, never a shared season-wide count.
 */
const WEEK_ONE: Record<string, Record<League, string>> = {
  "2026-27": { MAIS: "2026-08-14", MHSAA: "2026-08-28" },
};

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS,
  );
}

/** That league's own week number for a slate date, or null if unknown. */
export function leagueWeek(
  season: string,
  league: League,
  date: string,
): number | null {
  const anchor = WEEK_ONE[season]?.[league];
  if (!anchor) return null;
  const diff = daysBetween(anchor, date.slice(0, 10));
  if (diff < -1) return null;
  return Math.floor(Math.max(0, diff) / 7) + 1;
}

/**
 * The dates of the most recently completed slate.
 *
 * A week's games are spread over Thursday to Saturday, so this takes the last
 * date with a final and pulls in any finals from the three days before it —
 * enough to catch a Thursday opener without reaching back into last week.
 */
export function latestSlate(games: Game[]): string[] {
  const finals = games
    .filter((g) => g.status === "final")
    .map((g) => g.date.slice(0, 10));
  if (finals.length === 0) return [];
  const last = finals.reduce((a, b) => (a > b ? a : b));
  return [...new Set(finals.filter((d) => daysBetween(d, last) <= 3))].sort();
}

/**
 * The Monday-to-Sunday calendar week a slate belongs to.
 *
 * The slate itself is only the Thursday-to-Saturday dates that had finals, but
 * the recap is spoken about as a week, so the index heads it with the whole
 * week rather than the two or three days games happened to fall on.
 */
export function slateWeekRange(dates: string[]): [string, string] | null {
  const last = dates[dates.length - 1];
  if (!last) return null;
  const d = new Date(`${last}T12:00:00Z`);
  const monday = new Date(d);
  // getUTCDay() is Sunday-based; +6 %7 makes Monday the start of the week.
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return [iso(monday), iso(sunday)];
}

export interface NewspaperOptions {
  classification: string;
  /** Game dates that make up this week's slate. */
  dates: string[];
  scoreboardSize?: number;
}

export function buildNewspaper(
  data: Dataset,
  ranks: Map<string, PowerRank>,
  { classification, dates, scoreboardSize = 10 }: NewspaperOptions,
): Newspaper {
  const inClass = (t: Team | null) => !!t && t.classification === classification;
  const dateSet = new Set(dates);

  const seen = new Set<string>();
  const contests: Contest[] = [];
  for (const g of data.games) {
    if (!dateSet.has(g.date.slice(0, 10)) || g.status !== "final") continue;
    const key = contestKey(g, data);
    if (seen.has(key)) continue;
    const c = toContest(g, data, ranks, classification);
    if (!c) continue;
    if (!inClass(c.home) && !inClass(c.away)) continue;
    seen.add(key);
    contests.push(c);
  }

  const ranked = [...contests].sort((a, b) => newsworthiness(b) - newsworthiness(a));
  const headliners = ranked.slice(0, 3);

  // The scoreboard follows the class pecking order, not the news value, so it
  // reads like a standings table: best-ranked participant first.
  const bestRank = (c: Contest) =>
    Math.min(c.homeRank ?? Infinity, c.awayRank ?? Infinity);
  const scoreboard = [...contests]
    .filter((c) => Number.isFinite(bestRank(c)))
    .sort((a, b) => bestRank(a) - bestRank(b))
    .slice(0, scoreboardSize);

  return {
    contests,
    headliners,
    scoreboard,
    performances: performances(contests, data, classification),
    notebook: notebook(contests),
  };
}
