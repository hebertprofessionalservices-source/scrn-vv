import type { Dataset } from "./data";
import type { BoxScoreEntry, Game, Player, Team } from "./types";
import { initialForm, normalizeName } from "./efficiency";

/**
 * Weekly player performances, rebuilt from game box scores. "Week" is the
 * Monday-anchored calendar week of the game date (the schedule's own week
 * field is unpopulated). Box-score lines are attributed to roster players by
 * name; lines that can't be attributed unambiguously are dropped rather than
 * guessed at.
 */

export interface WeeklyLine {
  playerId: string | null;
  name: string;
  jersey: string | null;
  primary: string | null;
  secondary: string | null;
  teamName: string;
  teamLogo: string | null;
  classification: string;
  /** "vs Tupelo · W 42–21" */
  context: string;
  /** "312 YDS · 4 TD" */
  line: string;
  /** Primary sort metric for its bucket (yards; tackle composite for DEF). */
  value: number;
  /** Bucket TDs (pass/rush/rec; always 0 for DEF) for the TDs sort. */
  td: number;
}

export interface OutstandingLine {
  playerId: string | null;
  name: string;
  teamName: string;
  teamLogo: string | null;
  classification: string;
  weekLabel: string;
  context: string;
  badges: string[];
}

export type WeeklyBucket = "QB" | "RB" | "WR" | "DEF";

export interface WeekGroup {
  key: string;
  /** "Week 7" */
  label: string;
  /** "Oct 13 – Oct 18" */
  range: string;
  leaders: Record<WeeklyBucket, WeeklyLine[]>;
  outstanding: OutstandingLine[];
}

export interface WeeklyView {
  weeks: { key: string; label: string; range: string }[];
  latestKey: string | null;
  byWeek: Record<string, WeekGroup>;
  /** Season-long list, most recent first, capped. */
  outstandingSeason: OutstandingLine[];
  outstandingSeasonTotal: number;
}

export const WEEKLY_LEADER_LIMIT = 10;
export const OUTSTANDING_SEASON_CAP = 60;

/** One attributed player-game stat line. */
interface RawLine {
  player: Player;
  team: Team;
  opp: Team;
  isHome: boolean;
  game: Game;
  weekKey: string;
  passYds: number; passTd: number; passInt: number;
  rushYds: number; rushTd: number;
  rec: number; recYds: number; recTd: number;
  tackles: number; sacks: number; defInt: number; ff: number;
}

/** ISO date of the Monday of the game's calendar week. */
function mondayKey(date: string): string {
  const d = new Date(date.slice(0, 10) + "T12:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  return new Date(iso + "T12:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Unique name-form -> player map; ambiguous forms are dropped. */
function formMap(players: Player[]): Map<string, Player | null> {
  const map = new Map<string, Player | null>();
  const claim = (form: string, p: Player) =>
    map.set(form, map.has(form) && map.get(form)?.id !== p.id ? null : p);
  for (const p of players) {
    const n = normalizeName(p.name);
    if (!n) continue;
    claim(n, p);
    const init = initialForm(n);
    if (init) claim(init, p);
  }
  return map;
}

function extractLines(data: Dataset, asOf?: string): RawLine[] {
  const forms = new Map<string, Map<string, Player | null>>();
  const formsFor = (teamId: string) => {
    let m = forms.get(teamId);
    if (!m) {
      m = formMap(data.playersByTeam.get(teamId) ?? []);
      forms.set(teamId, m);
    }
    return m;
  };

  const lines = new Map<string, RawLine>();
  for (const g of data.games) {
    if (g.status !== "final" || !g.boxScore) continue;
    if (asOf && g.date.slice(0, 10) > asOf) continue;
    const home = data.teamsByAlias.get(g.homeTeamId);
    const away = data.teamsByAlias.get(g.awayTeamId);
    if (!home || !away || home.id === away.id) continue;
    const homeForms = formsFor(home.id);
    const awayForms = formsFor(away.id);

    type Resolved = { player: Player; team: Team; opp: Team; isHome: boolean };
    const resolve = (label: string): Resolved | null => {
      const n = normalizeName(label);
      const candidates = [n, initialForm(n)].filter(Boolean) as string[];
      let hit: Resolved | null = null;
      for (const f of candidates) {
        const h = homeForms.get(f);
        const a = awayForms.get(f);
        if (h && a) return null; // on both rosters — ambiguous
        const p = h ?? a;
        if (!p) continue;
        const side: Resolved = h
          ? { player: p, team: home, opp: away, isHome: true }
          : { player: p, team: away, opp: home, isHome: false };
        if (hit && hit.player.id !== side.player.id) return null;
        hit = side;
      }
      return hit;
    };

    const add = (
      entry: BoxScoreEntry,
      apply: (l: RawLine, e: BoxScoreEntry) => void,
    ) => {
      const r = resolve(entry.playerId);
      if (!r) return;
      const key = `${g.id}:${r.player.id}`;
      let l = lines.get(key);
      if (!l) {
        l = {
          player: r.player, team: r.team, opp: r.opp, isHome: r.isHome, game: g,
          weekKey: mondayKey(g.date),
          passYds: 0, passTd: 0, passInt: 0,
          rushYds: 0, rushTd: 0,
          rec: 0, recYds: 0, recTd: 0,
          tackles: 0, sacks: 0, defInt: 0, ff: 0,
        };
        lines.set(key, l);
      }
      apply(l, entry);
    };

    for (const e of g.boxScore.passing) add(e, (l, x) => {
      l.passYds += x.yds ?? 0; l.passTd += x.td ?? 0; l.passInt += x.int ?? 0;
    });
    for (const e of g.boxScore.rushing) add(e, (l, x) => {
      l.rushYds += x.yds ?? 0; l.rushTd += x.td ?? 0;
    });
    for (const e of g.boxScore.receiving) add(e, (l, x) => {
      l.rec += x.rec ?? 0; l.recYds += x.yds ?? 0; l.recTd += x.td ?? 0;
    });
    for (const e of g.boxScore.defense) add(e, (l, x) => {
      l.tackles += x.tackles ?? 0; l.sacks += x.sacks ?? 0;
      l.defInt += x.int ?? 0; l.ff += x.ff ?? 0;
    });
  }
  return [...lines.values()];
}

function context(l: RawLine): string {
  const g = l.game;
  const ha = l.isHome ? "vs" : "@";
  let result = "";
  if (g.homeScore !== null && g.awayScore !== null) {
    const mine = l.isHome ? g.homeScore : g.awayScore;
    const theirs = l.isHome ? g.awayScore : g.homeScore;
    const letter = mine > theirs ? "W" : mine < theirs ? "L" : "T";
    result = ` · ${letter} ${mine}–${theirs}`;
  }
  return `${ha} ${l.opp.name}${result}`;
}

const BUCKETS: Record<WeeklyBucket, {
  value: (l: RawLine) => number;
  td: (l: RawLine) => number;
  line: (l: RawLine) => string;
}> = {
  QB: {
    value: (l) => l.passYds,
    td: (l) => l.passTd,
    line: (l) => `${l.passYds} YDS · ${l.passTd} TD · ${l.passInt} INT`,
  },
  RB: {
    value: (l) => l.rushYds,
    td: (l) => l.rushTd,
    line: (l) => `${l.rushYds} YDS · ${l.rushTd} TD`,
  },
  WR: {
    value: (l) => l.recYds,
    td: (l) => l.recTd,
    line: (l) => `${l.rec} REC · ${l.recYds} YDS · ${l.recTd} TD`,
  },
  DEF: {
    value: (l) => l.tackles + l.sacks * 2 + l.defInt * 3,
    td: () => 0,
    line: (l) => `${l.tackles} TKL · ${l.sacks} SACK · ${l.defInt} INT`,
  },
};

/** Thresholds for the Outstanding Performances list. */
const OUTSTANDING: { test: (l: RawLine) => boolean; badge: (l: RawLine) => string }[] = [
  { test: (l) => l.passYds >= 250, badge: (l) => `${l.passYds} PASS YDS` },
  { test: (l) => l.passTd >= 3, badge: (l) => `${l.passTd} PASS TD` },
  { test: (l) => l.rushYds >= 150, badge: (l) => `${l.rushYds} RUSH YDS` },
  { test: (l) => l.rushTd >= 2, badge: (l) => `${l.rushTd} RUSH TD` },
  { test: (l) => l.recYds >= 125, badge: (l) => `${l.recYds} REC YDS` },
  { test: (l) => l.recTd >= 2, badge: (l) => `${l.recTd} REC TD` },
  { test: (l) => l.sacks >= 3, badge: (l) => `${l.sacks} SACKS` },
  { test: (l) => l.defInt >= 2, badge: (l) => `${l.defInt} INT` },
  { test: (l) => l.tackles >= 15, badge: (l) => `${l.tackles} TKL` },
];

function badges(l: RawLine): string[] {
  const out = OUTSTANDING.filter((t) => t.test(l)).map((t) => t.badge(l));
  const totalTd = l.passTd + l.rushTd + l.recTd;
  const hasTdBadge = out.some((b) => b.endsWith("TD"));
  if (totalTd >= 3 && !hasTdBadge) out.push(`${totalTd} TOTAL TD`);
  return out;
}

function toWeeklyLine(l: RawLine, bucket: WeeklyBucket): WeeklyLine {
  return {
    playerId: l.player.id,
    name: l.player.name,
    jersey: l.player.jersey,
    primary: l.team.colors.primary,
    secondary: l.team.colors.secondary,
    teamName: l.team.name,
    teamLogo: l.team.logoUrl,
    classification: l.team.classification,
    context: context(l),
    line: BUCKETS[bucket].line(l),
    value: BUCKETS[bucket].value(l),
    td: BUCKETS[bucket].td(l),
  };
}

export function buildWeeklyView(data: Dataset, asOf?: string): WeeklyView {
  const lines = extractLines(data, asOf);

  const byWeekLines = new Map<string, RawLine[]>();
  for (const l of lines) {
    const list = byWeekLines.get(l.weekKey) ?? [];
    list.push(l);
    byWeekLines.set(l.weekKey, list);
  }
  const orderedKeys = [...byWeekLines.keys()].sort();

  const byWeek: Record<string, WeekGroup> = {};
  const weeks: WeeklyView["weeks"] = [];
  const allOutstanding: (OutstandingLine & { sortKey: string })[] = [];

  orderedKeys.forEach((key, i) => {
    const wLines = byWeekLines.get(key)!;
    const label = `Week ${i + 1}`;
    const dates = wLines.map((l) => l.game.date.slice(0, 10)).sort();
    const range =
      dates[0] === dates[dates.length - 1]
        ? shortDate(dates[0])
        : `${shortDate(dates[0])} – ${shortDate(dates[dates.length - 1])}`;

    // Per-classification top-10 union (by yards and by TDs) so the client
    // can filter by class and re-sort without another server round trip.
    const leaders = {} as Record<WeeklyBucket, WeeklyLine[]>;
    for (const bucket of Object.keys(BUCKETS) as WeeklyBucket[]) {
      const { value, td } = BUCKETS[bucket];
      const byClass = new Map<string, RawLine[]>();
      for (const l of wLines) {
        if (value(l) <= 0 && td(l) <= 0) continue;
        const list = byClass.get(l.team.classification) ?? [];
        list.push(l);
        byClass.set(l.team.classification, list);
      }
      const chosen = new Set<RawLine>();
      for (const arr of byClass.values()) {
        [...arr]
          .sort((a, b) => value(b) - value(a))
          .slice(0, WEEKLY_LEADER_LIMIT)
          .forEach((l) => chosen.add(l));
        [...arr]
          .filter((l) => td(l) > 0)
          .sort((a, b) => td(b) - td(a) || value(b) - value(a))
          .slice(0, WEEKLY_LEADER_LIMIT)
          .forEach((l) => chosen.add(l));
      }
      leaders[bucket] = [...chosen]
        .sort((a, b) => value(b) - value(a))
        .map((l) => toWeeklyLine(l, bucket));
    }

    const outstanding: OutstandingLine[] = [];
    for (const l of wLines) {
      const b = badges(l);
      if (b.length === 0) continue;
      const o: OutstandingLine & { sortKey: string } = {
        playerId: l.player.id,
        name: l.player.name,
        teamName: l.team.name,
        teamLogo: l.team.logoUrl,
        classification: l.team.classification,
        weekLabel: label,
        context: context(l),
        badges: b,
        sortKey: l.game.date,
      };
      outstanding.push(o);
      allOutstanding.push(o);
    }
    outstanding.sort((a, b) => b.badges.length - a.badges.length);

    weeks.push({ key, label, range });
    byWeek[key] = { key, label, range, leaders, outstanding };
  });

  allOutstanding.sort(
    (a, b) => b.sortKey.localeCompare(a.sortKey) || b.badges.length - a.badges.length,
  );
  const outstandingSeason = allOutstanding
    .slice(0, OUTSTANDING_SEASON_CAP)
    .map(({ sortKey: _sortKey, ...rest }) => rest);

  return {
    weeks,
    latestKey: orderedKeys.length ? orderedKeys[orderedKeys.length - 1] : null,
    byWeek,
    outstandingSeason,
    outstandingSeasonTotal: allOutstanding.length,
  };
}
