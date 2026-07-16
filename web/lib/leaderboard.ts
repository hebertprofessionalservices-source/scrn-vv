import type { Player, Team } from "./types";
import { displaySlug } from "./display-slug";

export type LeaderCategory = "yds" | "td" | "ypg" | "eff" | "vol";
export type LeaderPosition = "QB" | "RB" | "WR";

export const CATEGORY_OPTIONS: { value: LeaderCategory; label: string }[] = [
  { value: "yds", label: "Yards" },
  { value: "td", label: "Touchdowns" },
  { value: "ypg", label: "Yards per Game" },
  { value: "eff", label: "Efficiency" },
  { value: "vol", label: "Attempts / Receptions" },
];

/** Canonical display order for classification dropdowns. */
export const CLASS_ORDER = [
  "7A", "6A", "5A", "4A", "3A", "2A", "1A",
  "MAIS-6A", "MAIS-5A", "MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-1A",
  "MAIS-8M-2A", "MAIS-8M-1A",
];

export interface LeaderEntry {
  id: string;
  name: string;
  jersey: string | null;
  teamName: string;
  teamLogo: string | null;
  primary: string | null;
  secondary: string | null;
  classification: string;
  yds: number;
  td: number;
  ypg: number;
  eff: number;
  vol: number;
  headline: string;
  secondaryLine: string;
}

export interface DefenseEntry {
  slug: string;
  name: string;
  logoUrl: string | null;
  classification: string;
  wins: number;
  losses: number;
  ppg: number;
}

export interface LeaderboardData {
  classes: string[];
  positions: Record<LeaderPosition, LeaderEntry[]>;
  defenses: DefenseEntry[];
}

interface PositionMeta {
  yds: (p: Player) => number;
  td: (p: Player) => number;
  eff: (p: Player) => number;
  vol: (p: Player) => number;
  /** Minimum attempts/receptions for the efficiency leaderboard. */
  effMinVol: number;
  secondaryLine: (p: Player) => string;
  statLabels: Record<LeaderCategory, string>;
  /** Short unit shown next to the value in list rows. */
  units: Record<LeaderCategory, string>;
}

export const POSITION_META: Record<LeaderPosition, PositionMeta> = {
  QB: {
    yds: (p) => p.stats.passing.yds,
    td: (p) => p.stats.passing.td,
    eff: (p) => p.stats.passing.rating,
    vol: (p) => p.stats.passing.att,
    effMinVol: 50,
    secondaryLine: (p) =>
      `INT ${p.stats.passing.int} · RAT ${p.stats.passing.rating.toFixed(1)}`,
    statLabels: {
      yds: "Passing Yards",
      td: "Passing TDs",
      ypg: "Passing Yards/Game",
      eff: "Passer Rating (min 50 Att)",
      vol: "Pass Attempts",
    },
    units: { yds: "YDS", td: "TD", ypg: "YPG", eff: "RAT", vol: "ATT" },
  },
  RB: {
    yds: (p) => p.stats.rushing.yds,
    td: (p) => p.stats.rushing.td,
    eff: (p) => p.stats.rushing.ypc,
    vol: (p) => p.stats.rushing.att,
    effMinVol: 50,
    secondaryLine: (p) =>
      `${p.stats.rushing.att} ATT · ${p.stats.rushing.ypc.toFixed(1)} YPC`,
    statLabels: {
      yds: "Rushing Yards",
      td: "Rushing TDs",
      ypg: "Rushing Yards/Game",
      eff: "Yards/Carry (min 50 Att)",
      vol: "Carries",
    },
    units: { yds: "YDS", td: "TD", ypg: "YPG", eff: "YPC", vol: "ATT" },
  },
  WR: {
    yds: (p) => p.stats.receiving.yds,
    td: (p) => p.stats.receiving.td,
    eff: (p) =>
      p.stats.receiving.rec > 0 ? p.stats.receiving.yds / p.stats.receiving.rec : 0,
    vol: (p) => p.stats.receiving.rec,
    effMinVol: 20,
    secondaryLine: (p) => `${p.stats.receiving.rec} REC`,
    statLabels: {
      yds: "Receiving Yards",
      td: "Receiving TDs",
      ypg: "Receiving Yards/Game",
      eff: "Yards/Reception (min 20 Rec)",
      vol: "Receptions",
    },
    units: { yds: "YDS", td: "TD", ypg: "YPG", eff: "Y/R", vol: "REC" },
  },
};

export const LEADERBOARD_LIMIT = 10;

const CATEGORIES: LeaderCategory[] = ["yds", "td", "ypg", "eff", "vol"];

function entryValue(e: LeaderEntry, category: LeaderCategory): number {
  return e[category];
}

/** True when the entry qualifies for the given category's leaderboard. */
export function qualifies(
  e: Pick<LeaderEntry, "vol">,
  category: LeaderCategory,
  pos: LeaderPosition,
): boolean {
  return category !== "eff" || e.vol >= POSITION_META[pos].effMinVol;
}

/**
 * Compact payload for the client-side home leaderboards. For each position
 * and classification only the union of the top 10 in every category is
 * kept, so any (class × category) selection the client can make is fully
 * covered without shipping all 14k players.
 */
export function buildLeaderboardData(teams: Team[], players: Player[]): LeaderboardData {
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const positions = {} as Record<LeaderPosition, LeaderEntry[]>;
  for (const pos of Object.keys(POSITION_META) as LeaderPosition[]) {
    const m = POSITION_META[pos];

    const byClass = new Map<string, LeaderEntry[]>();
    for (const p of players) {
      if (p.position !== pos) continue;
      const yds = m.yds(p);
      const td = m.td(p);
      if (yds <= 0 && td <= 0) continue;
      const team = teamsById.get(p.teamId);
      if (!team) continue;
      const entry: LeaderEntry = {
        id: p.id,
        name: p.name,
        jersey: p.jersey,
        teamName: team.name,
        teamLogo: team.logoUrl,
        primary: team.colors.primary,
        secondary: team.colors.secondary,
        classification: team.classification,
        yds,
        td,
        ypg: p.gamesPlayed > 0 ? yds / p.gamesPlayed : 0,
        eff: m.eff(p),
        vol: m.vol(p),
        headline: `${yds.toLocaleString()} YDS · ${td} TD`,
        secondaryLine: m.secondaryLine(p),
      };
      const list = byClass.get(team.classification) ?? [];
      list.push(entry);
      byClass.set(team.classification, list);
    }

    const keep = new Map<string, LeaderEntry>();
    for (const list of byClass.values()) {
      for (const cat of CATEGORIES) {
        const ranked = list
          .filter((e) => qualifies(e, cat, pos))
          .sort((a, b) => entryValue(b, cat) - entryValue(a, cat) || b.yds - a.yds);
        for (const e of ranked.slice(0, LEADERBOARD_LIMIT)) keep.set(e.id, e);
      }
    }
    positions[pos] = [...keep.values()];
  }

  const defenses: DefenseEntry[] = teams
    .filter((t) => t.record.wins + t.record.losses > 0)
    .map((t) => ({
      slug: displaySlug(t),
      name: t.name,
      logoUrl: t.logoUrl,
      classification: t.classification,
      wins: t.record.wins,
      losses: t.record.losses,
      ppg: t.stats.pointsAgainst / (t.record.wins + t.record.losses),
    }));

  const present = new Set(teams.map((t) => t.classification));
  const classes = [
    ...CLASS_ORDER.filter((c) => present.has(c as Team["classification"])),
    ...[...present].filter((c) => !CLASS_ORDER.includes(c)).sort(),
  ];

  return { classes, positions, defenses };
}

/**
 * Client-side ranking: filter to qualifiers, order by the selected category,
 * ties broken by yards.
 */
export function rankLeaders(
  entries: LeaderEntry[],
  category: LeaderCategory,
  pos: LeaderPosition,
): LeaderEntry[] {
  return entries
    .filter((e) => qualifies(e, category, pos))
    .sort((a, b) => entryValue(b, category) - entryValue(a, category) || b.yds - a.yds);
}

/** Display format for a category value ("2,840", "112.4", "31"). */
export function formatValue(value: number, category: LeaderCategory): string {
  if (category === "ypg" || category === "eff") return value.toFixed(1);
  return value.toLocaleString();
}
