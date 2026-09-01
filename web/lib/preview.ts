import type { Dataset } from "./data";
import type { PowerRank } from "./power";
import type { Game, Team } from "./types";
import { contestKey, mondayOf, prettifySlug, schoolName } from "./newspaper";
import { leadersFor } from "./game-leaders";
import { gameStatLines } from "./weekly";
import { buildSeries, type HistoryData } from "./history";

/**
 * The Recap's mirror image: this week's games before they are played.
 *
 * Same newsprint page, same blocks, but nothing here can lean on a result. The
 * lead games are chosen from what the matchup promises — both sides ranked, a
 * close power rating, a region game, a long series — and the player module runs
 * on season stats plus each side's best line from last week.
 */

export interface Fixture {
  game: Game;
  home: Team | null;
  away: Team | null;
  homeSchool: string;
  awaySchool: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeRank: number | null;
  awayRank: number | null;
  homeInClass: boolean;
  awayInClass: boolean;
  homeRecord: string;
  awayRecord: string;
  /** Rating points between the sides; null when either is unrated. */
  ratingGap: number | null;
  favored: "home" | "away" | null;
  /** Win probability for the favoured side, 0.5–1. */
  favoredPct: number | null;
  /** Times these two have met, all-time, from the AFHS history set. */
  meetings: number;
  region: boolean;
  /** "Fri" — kickoff times are not in the data, only the date. */
  day: string;
  buzz: number;
}

export interface WatchPlayer {
  name: string;
  school: string;
  logo: string | null;
  line: string;
  /** Sort key; larger is more notable. */
  weight: number;
}

export interface PreviewNote {
  logo: string | null;
  label: string;
  text: string;
}

export interface Preview {
  fixtures: Fixture[];
  headliners: Fixture[];
  board: Fixture[];
  watch: WatchPlayer[];
  notes: PreviewNote[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayName(date: string): string {
  return DAYS[new Date(`${date.slice(0, 10)}T12:00:00Z`).getUTCDay()];
}

const wl = (t: Team | null) => (t ? `${t.record.wins}–${t.record.losses}` : "—");

/**
 * The Monday-to-Sunday week a date sits in. The preview is spoken about as a
 * week ("Aug 31 – Sep 6"), even though the games themselves land Thu–Sat.
 */
export function currentWeekRange(today: string): [string, string] {
  const monday = mondayOf(today);
  const sunday = new Date(`${monday}T12:00:00Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return [monday, sunday.toISOString().slice(0, 10)];
}

/** Dates inside the range that actually have games on the schedule. */
export function slateDates(games: Game[], [from, to]: [string, string]): string[] {
  const dates = games
    .filter((g) => {
      const d = g.date.slice(0, 10);
      return d >= from && d <= to && g.status !== "final";
    })
    .map((g) => g.date.slice(0, 10));
  return [...new Set(dates)].sort();
}

/**
 * How much an unplayed game deserves the front page.
 *
 * Two ranked teams lead, sharpened by how close the power ratings are; a region
 * meeting and a deep series both add on top. Nothing here can look at a score,
 * so a game between two unranked teams with no history scores near zero however
 * good it might turn out to be.
 */
function buzz(f: Fixture): number {
  let score = 0;
  if (f.homeRank !== null && f.awayRank !== null) {
    score += 45;
    // Two top-5 teams beat two teams ranked 9th and 10th.
    score += Math.max(0, 30 - (f.homeRank + f.awayRank));
    if (f.ratingGap !== null) {
      if (f.ratingGap <= 3) score += 25;
      else if (f.ratingGap <= 7) score += 12;
    }
  } else if (f.homeRank !== null || f.awayRank !== null) {
    const rank = f.homeRank ?? f.awayRank ?? 99;
    score += 15 + Math.max(0, 12 - rank);
  }
  if (f.region) score += 12;
  score += Math.min(f.meetings, 10);
  return score;
}

function toFixture(
  g: Game,
  data: Dataset,
  ranks: Map<string, PowerRank>,
  history: HistoryData | null,
  classification: string,
): Fixture | null {
  const home = data.teamsByAlias.get(g.homeTeamId) ?? null;
  const away = data.teamsByAlias.get(g.awayTeamId) ?? null;
  const inClass = (t: Team | null) => !!t && t.classification === classification;
  // classRank only means something on a page about that class — see toContest.
  const rankOf = (t: Team | null) =>
    inClass(t) ? ranks.get(t!.id)?.classRank ?? null : null;

  const aRating = home ? ranks.get(home.id)?.rating ?? null : null;
  const bRating = away ? ranks.get(away.id)?.rating ?? null : null;
  let ratingGap: number | null = null;
  let favored: "home" | "away" | null = null;
  let favoredPct: number | null = null;
  if (aRating !== null && bRating !== null) {
    ratingGap = Math.abs(aRating - bRating);
    favored = aRating >= bRating ? "home" : "away";
    // Same logistic the matchup page's AI Pick uses, so the two never disagree.
    const pHome = 1 / (1 + Math.exp(-(aRating - bRating) / 7));
    favoredPct = Math.max(pHome, 1 - pHome);
  }

  const schoolA = home ? history?.teamMap[home.id] : undefined;
  const schoolB = away ? history?.teamMap[away.id] : undefined;
  const series =
    history && schoolA && schoolB ? buildSeries(history.games, schoolA, schoolB) : null;
  const meetings = series ? series.aWins + series.bWins + series.ties : 0;

  const logoFor = (t: Team | null, slug: string) =>
    t?.logoUrl ?? data.opponentLogos.get(slug) ?? null;

  const fixture: Fixture = {
    game: g,
    home,
    away,
    homeSchool: schoolName(home, home?.name ?? prettifySlug(g.homeTeamId)),
    awaySchool: schoolName(away, away?.name ?? prettifySlug(g.awayTeamId)),
    homeLogo: logoFor(home, g.homeTeamId),
    awayLogo: logoFor(away, g.awayTeamId),
    homeRank: rankOf(home),
    awayRank: rankOf(away),
    homeInClass: inClass(home),
    awayInClass: inClass(away),
    homeRecord: wl(home),
    awayRecord: wl(away),
    ratingGap,
    favored,
    favoredPct,
    meetings,
    region:
      inClass(home) &&
      inClass(away) &&
      !!home?.district &&
      home!.district === away!.district,
    day: dayName(g.date),
    buzz: 0,
  };
  fixture.buzz = buzz(fixture);
  return fixture;
}

/**
 * Season stat leaders for the teams being highlighted, loudest lines first.
 *
 * Ordered by production rather than by fixture, so the module opens with the
 * player worth naming on air instead of whoever happened to come first.
 */
function watchList(fixtures: Fixture[], data: Dataset, classification: string): WatchPlayer[] {
  const out: WatchPlayer[] = [];
  const seen = new Set<string>();
  for (const f of fixtures) {
    for (const team of [f.home, f.away]) {
      if (!team || team.classification !== classification) continue;
      const leaders = leadersFor(data.playersByTeam.get(team.id) ?? []);
      for (const l of [...leaders.offense, ...leaders.defense]) {
        if (seen.has(l.player.id)) continue;
        seen.add(l.player.id);
        const s = l.player.stats;
        const yards = s.passing.yds + s.rushing.yds + s.receiving.yds;
        const tds = s.passing.td + s.rushing.td + s.receiving.td;
        out.push({
          name: l.player.name,
          school: schoolName(team, team.name),
          logo: team.logoUrl ?? null,
          line: `${l.role} · ${l.line}`,
          // Defensive lines carry no yardage, so weight tackles into the same
          // scale or a 200-yard rusher would rank below a 7-tackle linebacker.
          weight: yards + tds * 45 + s.defense.tackles * 8 + s.defense.sacks * 20,
        });
      }
    }
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * "Coming off" notes: each headlined team's best line from its last completed
 * game, so the preview carries recent form and not just season aggregates.
 */
function comingOff(
  fixtures: Fixture[],
  data: Dataset,
  classification: string,
): PreviewNote[] {
  const notes: PreviewNote[] = [];
  const used = new Set<string>();
  for (const f of fixtures) {
    for (const team of [f.home, f.away]) {
      if (!team || team.classification !== classification) continue;
      if (used.has(team.id)) continue;
      const last = (data.gamesByTeam.get(team.id) ?? [])
        .filter((g) => g.status === "final" && g.boxScore)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!last) continue;
      const lines = gameStatLines(data, last).filter((l) => l.team.id === team.id);
      if (lines.length === 0) continue;
      const best = lines.reduce((a, b) =>
        b.rushYds + b.passYds + b.recYds > a.rushYds + a.passYds + a.recYds ? b : a,
      );
      const yards = Math.max(best.passYds, best.rushYds, best.recYds);
      if (yards < 50) continue;
      const unit =
        yards === best.passYds ? "PASS YDS" : yards === best.rushYds ? "RUSH YDS" : "REC YDS";
      const td = best.passTd + best.rushTd + best.recTd;
      used.add(team.id);
      notes.push({
        logo: team.logoUrl ?? null,
        label: `${schoolName(team, team.name).toUpperCase()} COMING OFF`,
        text: `${best.player.name}: ${yards} ${unit}${td ? `, ${td} TD` : ""}.`,
      });
    }
  }
  return notes.slice(0, 4);
}

export interface PreviewOptions {
  classification: string;
  /** Scheduled game dates that make up this week's slate. */
  dates: string[];
  boardSize?: number;
}

export function buildPreview(
  data: Dataset,
  ranks: Map<string, PowerRank>,
  history: HistoryData | null,
  { classification, dates, boardSize = 10 }: PreviewOptions,
): Preview {
  const dateSet = new Set(dates);
  const seen = new Set<string>();
  const fixtures: Fixture[] = [];

  for (const g of data.games) {
    if (!dateSet.has(g.date.slice(0, 10)) || g.status === "final") continue;
    const key = contestKey(g, data);
    if (seen.has(key)) continue;
    const f = toFixture(g, data, ranks, history, classification);
    if (!f) continue;
    if (!f.homeInClass && !f.awayInClass) continue;
    seen.add(key);
    fixtures.push(f);
  }

  const headliners = [...fixtures].sort((a, b) => b.buzz - a.buzz).slice(0, 3);

  // The board reads like a standings table: best-ranked participant first.
  const bestRank = (f: Fixture) =>
    Math.min(f.homeRank ?? Infinity, f.awayRank ?? Infinity);
  const board = [...fixtures]
    .filter((f) => Number.isFinite(bestRank(f)))
    .sort((a, b) => bestRank(a) - bestRank(b))
    .slice(0, boardSize);

  return {
    fixtures,
    headliners,
    board,
    watch: watchList(headliners, data, classification),
    notes: comingOff(headliners, data, classification),
  };
}

/** The two sides of a preview row, led by the higher-ranked in-class team. */
export function previewSides(f: Fixture): {
  lead: { school: string; rank: number | null; record: string; logo: string | null };
  foe: { school: string; rank: number | null; record: string; logo: string | null };
} {
  const home = {
    school: f.homeSchool, rank: f.homeRank, record: f.homeRecord, logo: f.homeLogo,
  };
  const away = {
    school: f.awaySchool, rank: f.awayRank, record: f.awayRecord, logo: f.awayLogo,
  };
  // A cross-class game leads with the team the page is about; otherwise the
  // better-ranked side leads, the way a preview normally reads.
  if (f.homeInClass !== f.awayInClass) {
    return f.homeInClass ? { lead: home, foe: away } : { lead: away, foe: home };
  }
  const homeFirst = (f.homeRank ?? Infinity) <= (f.awayRank ?? Infinity);
  return homeFirst ? { lead: home, foe: away } : { lead: away, foe: home };
}
