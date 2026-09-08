import type { Dataset } from "./data";
import type { BoxScoreEntry, Game, Team } from "./types";
import { initialForm, normalizeName } from "./efficiency";
import { gameStatLines } from "./weekly";

/**
 * One game's box score, for the recap show to read numbers off.
 *
 * Coaches enter these themselves, so coverage is partial: about a third of
 * completed games carry attributable player lines. A game with none still
 * renders — final score and quarters are always worth having — rather than
 * 404ing.
 *
 * Lines come from the RAW box-score entries, not the weekly RawLine summary,
 * because a box score wants completions and attempts, not just yardage. Team
 * attribution is borrowed from gameStatLines so there is one implementation of
 * the name matching, which is the part that is easy to get wrong.
 */

export interface BoxLine {
  name: string;
  /** Set when the player is on a roster we hold, for a profile link. */
  playerId: string | null;
  line: string;
  /** Sort key within its group; larger first. */
  weight: number;
}

export interface BoxTeamStats {
  passing: BoxLine[];
  rushing: BoxLine[];
  receiving: BoxLine[];
  defense: BoxLine[];
  /** Totals from the attributed lines, for a quick team comparison. */
  passYds: number;
  rushYds: number;
}

export interface BoxSide {
  team: Team | null;
  name: string;
  logo: string | null;
  score: number;
  quarters: number[];
  stats: BoxTeamStats;
}

export interface GameBox {
  game: Game;
  away: BoxSide;
  home: BoxSide;
  /** Entries whose player could not be matched to either roster. */
  unattributed: number;
  hasStats: boolean;
}

const CLASS_SUFFIX = /\((Fr|So|Jr|Sr)\)$/i;

/** "J. Long(Sr)" -> "J. Long"; the class marker is not part of the name. */
function entryName(raw: string): string {
  return raw.replace(CLASS_SUFFIX, "").trim();
}

const n = (v: number | null | undefined): number => v ?? 0;

function emptyStats(): BoxTeamStats {
  return { passing: [], rushing: [], receiving: [], defense: [], passYds: 0, rushYds: 0 };
}

/** "13/26, 178 YDS, 2 TD, 1 INT" — only the parts the entry actually has. */
function passingLine(e: BoxScoreEntry): string {
  const parts: string[] = [];
  if (e.att !== null) parts.push(`${n(e.cmp)}/${e.att}`);
  parts.push(`${n(e.yds).toLocaleString()} YDS`);
  if (n(e.td)) parts.push(`${e.td} TD`);
  if (n(e.int)) parts.push(`${e.int} INT`);
  return parts.join(", ");
}

function rushingLine(e: BoxScoreEntry): string {
  const parts: string[] = [];
  if (e.att !== null) parts.push(`${e.att} CAR`);
  parts.push(`${n(e.yds).toLocaleString()} YDS`);
  if (n(e.td)) parts.push(`${e.td} TD`);
  return parts.join(", ");
}

function receivingLine(e: BoxScoreEntry): string {
  const parts: string[] = [];
  if (e.rec !== null) parts.push(`${e.rec} REC`);
  parts.push(`${n(e.yds).toLocaleString()} YDS`);
  if (n(e.td)) parts.push(`${e.td} TD`);
  return parts.join(", ");
}

function defenseLine(e: BoxScoreEntry): string {
  const parts: string[] = [];
  if (n(e.tackles)) parts.push(`${e.tackles} TKL`);
  if (n(e.sacks)) parts.push(`${e.sacks} SACK`);
  if (n(e.int)) parts.push(`${e.int} INT`);
  if (n(e.ff)) parts.push(`${e.ff} FF`);
  return parts.join(", ");
}

export function buildBoxScore(data: Dataset, game: Game): GameBox | null {
  if (game.homeScore === null || game.awayScore === null) return null;
  const homeTeam = data.teamsByAlias.get(game.homeTeamId) ?? null;
  const awayTeam = data.teamsByAlias.get(game.awayTeamId) ?? null;

  /*
   * Borrow the attribution: gameStatLines already resolves each entry's player
   * against both rosters and drops anything ambiguous. Keying that result by
   * normalised name gives us team + playerId for the raw entries below.
   */
  const owner = new Map<string, { teamId: string; playerId: string }>();
  for (const l of gameStatLines(data, game)) {
    const owned = { teamId: l.team.id, playerId: l.player.id };
    // Box-score labels abbreviate the first name ("J. Long" for Jay Long), so
    // index the roster name under both forms — the same pair gameStatLines
    // matches on.
    const full = normalizeName(l.player.name);
    owner.set(full, owned);
    const initial = initialForm(full);
    if (initial) owner.set(initial, owned);
  }

  /** Look up an entry label under its full form, then its initial form. */
  const ownerOf = (label: string) => {
    const norm = normalizeName(label);
    const initial = initialForm(norm);
    return owner.get(norm) ?? (initial ? owner.get(initial) : undefined);
  };

  const stats = new Map<string, BoxTeamStats>([
    [homeTeam?.id ?? "home", emptyStats()],
    [awayTeam?.id ?? "away", emptyStats()],
  ]);
  let unattributed = 0;

  const add = (
    entry: BoxScoreEntry,
    group: keyof Pick<BoxTeamStats, "passing" | "rushing" | "receiving" | "defense">,
    format: (e: BoxScoreEntry) => string,
    weight: number,
  ) => {
    const name = entryName(entry.playerId);
    const hit = ownerOf(name);
    if (!hit) {
      unattributed++;
      return;
    }
    const side = stats.get(hit.teamId);
    if (!side) {
      unattributed++;
      return;
    }
    const line = format(entry);
    if (!line) return;
    side[group].push({ name, playerId: hit.playerId, line, weight });
    if (group === "passing") side.passYds += n(entry.yds);
    if (group === "rushing") side.rushYds += n(entry.yds);
  };

  const box = game.boxScore;
  if (box) {
    for (const e of box.passing) add(e, "passing", passingLine, n(e.yds));
    for (const e of box.rushing) add(e, "rushing", rushingLine, n(e.yds));
    for (const e of box.receiving) add(e, "receiving", receivingLine, n(e.yds));
    for (const e of box.defense)
      add(e, "defense", defenseLine, n(e.tackles) * 10 + n(e.sacks) * 5 + n(e.int) * 5);
  }

  for (const side of stats.values()) {
    for (const g of ["passing", "rushing", "receiving", "defense"] as const) {
      side[g].sort((a, b) => b.weight - a.weight);
    }
  }

  const q = game.quarterScores;
  const side = (team: Team | null, key: string, score: number, quarters: number[]): BoxSide => ({
    team,
    name: team?.name ?? key,
    logo: team?.logoUrl ?? data.opponentLogos.get(key) ?? null,
    score,
    quarters,
    stats: stats.get(team?.id ?? key) ?? emptyStats(),
  });

  const away = side(awayTeam, game.awayTeamId, game.awayScore, q?.away ?? []);
  const home = side(homeTeam, game.homeTeamId, game.homeScore, q?.home ?? []);
  const count = (s: BoxTeamStats) =>
    s.passing.length + s.rushing.length + s.receiving.length + s.defense.length;

  return {
    game,
    away,
    home,
    unattributed,
    hasStats: count(away.stats) + count(home.stats) > 0,
  };
}
