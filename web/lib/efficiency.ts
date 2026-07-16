import type { Dataset } from "./data";
import type { BoxScoreEntry, Player, Team } from "./types";

/**
 * Client-approved composite efficiency index:
 *
 *   Offensive Efficiency = 50% Off-PPG percentile + 50% Yards-per-Play percentile
 *   Defensive Efficiency = 50% Def-PPG percentile + 50% Def-Yards-per-Game percentile
 *                          (Def PPG alone where box-score coverage is under half
 *                           the team's games)
 *
 * Percentiles are taken against all Mississippi teams, so 87 reads as
 * "better than 87% of the state." Defensive yardage is never published by
 * coaches, so it is solved from the inverse of opponents' offensive box-score
 * output, attributed to teams by roster name matching. Anything that cannot
 * be computed honestly stays null (rendered as n/a).
 */
export interface TeamEfficiency {
  offPpg: number | null;
  offYdsPerRush: number | null;
  offYdsPerPass: number | null;
  offYdsPerPlay: number | null;
  defPpg: number | null;
  defYdsPerGame: number | null;
  defYdsPerPass: number | null;
  /** Box-score games the defensive numbers are based on. */
  defCoverage: { covered: number; games: number };
  offIndex: number | null;
  defIndex: number | null;
}

/** Fraction of a game's yardage we may fail to attribute before skipping it. */
const MAX_UNATTRIBUTED = 0.15;
/** Minimum share of games with box scores before def yardage joins the index. */
const MIN_DEF_COVERAGE = 0.5;

function normalizeName(label: string): string {
  return label
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "d pittman" — first-initial form for abbreviated box-score labels. */
function initialForm(normalized: string): string | null {
  const parts = normalized.split(" ");
  if (parts.length < 2) return null;
  return `${parts[0][0]} ${parts[parts.length - 1]}`;
}

function buildNameIndex(players: Player[]): Set<string> {
  const keys = new Set<string>();
  for (const p of players) {
    const n = normalizeName(p.name);
    if (!n) continue;
    keys.add(n);
    const init = initialForm(n);
    if (init) keys.add(init);
  }
  return keys;
}

interface DefTotals {
  yds: number;
  passYds: number;
  passAtt: number;
  covered: number;
}

export function buildTeamEfficiency(data: Dataset): Map<string, TeamEfficiency> {
  // --- Offense: yards from team season stats, attempts from rosters. ---
  const attempts = new Map<string, { rush: number; pass: number }>();
  for (const [teamId, players] of data.playersByTeam) {
    let rush = 0;
    let pass = 0;
    for (const p of players) {
      rush += p.stats.rushing.att;
      pass += p.stats.passing.att;
    }
    attempts.set(teamId, { rush, pass });
  }

  // --- Defense: inverse of opponents' box-score output. ---
  const nameIndex = new Map<string, Set<string>>();
  for (const t of data.teams) {
    nameIndex.set(t.id, buildNameIndex(data.playersByTeam.get(t.id) ?? []));
  }
  const def = new Map<string, DefTotals>();
  const defEntry = (id: string) => {
    let e = def.get(id);
    if (!e) {
      e = { yds: 0, passYds: 0, passAtt: 0, covered: 0 };
      def.set(id, e);
    }
    return e;
  };

  for (const g of data.games) {
    if (g.dataStatus !== "complete" || !g.boxScore || g.status !== "final") continue;
    const home = data.teamsByAlias.get(g.homeTeamId);
    const away = data.teamsByAlias.get(g.awayTeamId);
    if (!home || !away || home.id === away.id) continue;
    const homeNames = nameIndex.get(home.id) ?? new Set();
    const awayNames = nameIndex.get(away.id) ?? new Set();

    // Offense total per side; receiving mirrors passing yardage, so a team's
    // offense = its passing + rushing entries.
    const sides = {
      home: { yds: 0, passYds: 0, passAtt: 0 },
      away: { yds: 0, passYds: 0, passAtt: 0 },
      lost: 0,
    };
    const attribute = (entry: BoxScoreEntry): "home" | "away" | null => {
      const n = normalizeName(entry.playerId);
      const forms = [n, initialForm(n)].filter(Boolean) as string[];
      const inHome = forms.some((f) => homeNames.has(f));
      const inAway = forms.some((f) => awayNames.has(f));
      if (inHome === inAway) return null; // neither, or ambiguous
      return inHome ? "home" : "away";
    };
    for (const kind of ["passing", "rushing"] as const) {
      for (const entry of g.boxScore[kind]) {
        const yds = entry.yds ?? 0;
        const side = attribute(entry);
        if (side === null) {
          sides.lost += yds;
          continue;
        }
        sides[side].yds += yds;
        if (kind === "passing") {
          sides[side].passYds += yds;
          sides[side].passAtt += entry.att ?? 0;
        }
      }
    }
    const total = sides.home.yds + sides.away.yds + sides.lost;
    if (total === 0 || sides.lost / total > MAX_UNATTRIBUTED) continue;

    const homeDef = defEntry(home.id);
    homeDef.yds += sides.away.yds;
    homeDef.passYds += sides.away.passYds;
    homeDef.passAtt += sides.away.passAtt;
    homeDef.covered += 1;
    const awayDef = defEntry(away.id);
    awayDef.yds += sides.home.yds;
    awayDef.passYds += sides.home.passYds;
    awayDef.passAtt += sides.home.passAtt;
    awayDef.covered += 1;
  }

  // --- Assemble raw metrics. ---
  const raw = new Map<string, TeamEfficiency>();
  for (const t of data.teams) {
    const games = t.record.wins + t.record.losses;
    const att = attempts.get(t.id) ?? { rush: 0, pass: 0 };
    const hasYards = t.stats.passYdsFor + t.stats.rushYdsFor > 0;
    const d = def.get(t.id);
    raw.set(t.id, {
      offPpg: games > 0 ? t.stats.pointsFor / games : null,
      offYdsPerRush:
        hasYards && att.rush > 0 ? t.stats.rushYdsFor / att.rush : null,
      offYdsPerPass:
        hasYards && att.pass > 0 ? t.stats.passYdsFor / att.pass : null,
      offYdsPerPlay:
        hasYards && att.rush + att.pass > 0
          ? (t.stats.rushYdsFor + t.stats.passYdsFor) / (att.rush + att.pass)
          : null,
      defPpg: games > 0 ? t.stats.pointsAgainst / games : null,
      defYdsPerGame: d && d.covered > 0 ? d.yds / d.covered : null,
      defYdsPerPass: d && d.passAtt > 0 ? d.passYds / d.passAtt : null,
      defCoverage: { covered: d?.covered ?? 0, games },
      offIndex: null,
      defIndex: null,
    });
  }

  // --- Percentile blend. ---
  const pct = percentiler();
  const offPpgPct = pct([...raw.values()].map((e) => e.offPpg), false);
  const offYppPct = pct([...raw.values()].map((e) => e.offYdsPerPlay), false);
  const defPpgPct = pct([...raw.values()].map((e) => e.defPpg), true);
  const defYpgPct = pct(
    [...raw.values()].map((e) =>
      e.defCoverage.games > 0 &&
      e.defCoverage.covered / e.defCoverage.games >= MIN_DEF_COVERAGE
        ? e.defYdsPerGame
        : null,
    ),
    true,
  );

  let i = 0;
  for (const e of raw.values()) {
    const oPpg = offPpgPct[i];
    const oYpp = offYppPct[i];
    if (oPpg !== null && oYpp !== null) e.offIndex = Math.round(0.5 * oPpg + 0.5 * oYpp);
    const dPpg = defPpgPct[i];
    const dYpg = defYpgPct[i];
    if (dPpg !== null) {
      e.defIndex = Math.round(dYpg !== null ? 0.5 * dPpg + 0.5 * dYpg : dPpg);
    }
    i++;
  }
  return raw;
}

/**
 * Rank-based percentiles over the non-null values; null in → null out.
 * `lowerIsBetter` flips the direction so 100 is always "best in state."
 */
function percentiler() {
  return (values: (number | null)[], lowerIsBetter: boolean): (number | null)[] => {
    const present = values.filter((v): v is number => v !== null);
    const n = present.length;
    if (n <= 1) return values.map((v) => (v === null ? null : 50));
    return values.map((v) => {
      if (v === null) return null;
      const worse = present.filter((x) => (lowerIsBetter ? x > v : x < v)).length;
      return (worse / (n - 1)) * 100;
    });
  };
}
