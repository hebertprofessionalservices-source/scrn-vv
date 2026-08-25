import { describe, expect, it } from "vitest";
import { buildUpsets, UPSET_THRESHOLD } from "@/lib/upsets";
import type { Dataset } from "@/lib/data";
import type { Game, Team } from "@/lib/types";

// Games are dated inside the week before this, per lastWeeksGames().
const TODAY = new Date("2026-08-24T12:00:00Z");
const GAME_DATE = "2026-08-21";

function team(id: string, classification: string, wins = 0, losses = 0): Team {
  return {
    id,
    name: id.replace(/-/g, " "),
    mascot: null,
    city: null,
    classification,
    district: null,
    logoUrl: null,
    season: "2026-27",
    record: { wins, losses },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {} as Team["stats"],
    headCoach: null,
    maxprepsUrl: null,
  } as unknown as Team;
}

function game(id: string, home: string, away: string, hs: number, as: number): Game {
  return {
    id, season: "2026-27", week: 0, date: GAME_DATE,
    homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as,
    quarterScores: { home: [], away: [] },
    status: "final", dataStatus: "missing", venue: null, boxScore: null,
    maxprepsUrl: `https://x/?c=${id}`,
  } as unknown as Game;
}

/** Minimal Dataset with a rating injected per team id. */
function dataset(teams: Team[], games: Game[]): Dataset {
  const byAlias = new Map(teams.map((t) => [t.id, t]));
  return {
    teams, players: [], games,
    teamsById: byAlias, teamsBySlug: byAlias, teamsByAlias: byAlias,
    playersById: new Map(), playersByTeam: new Map(),
    gamesByTeam: new Map(), gamesById: new Map(),
    opponentLogos: new Map(),
    season: "2026-27", priorRatings: null, priorStateRanks: null,
  } as unknown as Dataset;
}

// A 20-point rating gap is ~94%; 3 points is ~60%.
const RATINGS: Record<string, number> = {
  giant: 20, big: 14, mid: 3, small: 0, tiny: -20,
  "mais-giant": 20, "mais-small": 0,
};
const rate = (id: string) => RATINGS[id] ?? 0;

describe("buildUpsets", () => {
  it("flags a heavy favourite losing", () => {
    const teams = [team("giant", "7A"), team("tiny", "7A")];
    const data = dataset(teams, [game("g1", "tiny", "giant", 21, 14)]);
    const out = buildUpsets(data, "MHSAA", { rate, today: TODAY });
    expect(out).toHaveLength(1);
    expect(out[0].favorite.team.id).toBe("giant");
    expect(out[0].favorite.score).toBe(14);
    expect(out[0].winner.team.id).toBe("tiny");
    expect(out[0].winner.score).toBe(21);
    expect(out[0].favoriteWinProb).toBeGreaterThan(UPSET_THRESHOLD);
    expect(out[0].clearedThreshold).toBe(true);
  });

  it("ignores the favourite winning", () => {
    const teams = [team("giant", "7A"), team("tiny", "7A")];
    const data = dataset(teams, [game("g1", "giant", "tiny", 42, 0)]);
    expect(buildUpsets(data, "MHSAA", { rate, today: TODAY })).toEqual([]);
  });

  it("ranks bigger upsets first", () => {
    const teams = [team("giant", "7A"), team("big", "7A"), team("mid", "7A"), team("small", "7A")];
    const data = dataset(teams, [
      game("close", "small", "mid", 10, 7), // mid barely favoured
      game("huge", "small", "giant", 10, 7), // giant heavily favoured
    ]);
    const out = buildUpsets(data, "MHSAA", { rate, today: TODAY });
    expect(out.map((u) => u.gameId)).toEqual(["huge", "close"]);
  });

  it("tops up with sub-threshold upsets when too few clear 80%", () => {
    const teams = [team("mid", "7A"), team("small", "7A")];
    const data = dataset(teams, [game("g1", "small", "mid", 14, 7)]);
    const out = buildUpsets(data, "MHSAA", { rate, today: TODAY });
    // ~60% favourite — below the bar, but still returned as the best available.
    expect(out).toHaveLength(1);
    expect(out[0].clearedThreshold).toBe(false);
    expect(out[0].favoriteWinProb).toBeLessThan(UPSET_THRESHOLD);
  });

  it("caps at three", () => {
    const teams = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => team(id, "7A"));
    const games = [
      game("g1", "b", "a", 1, 0), game("g2", "d", "c", 1, 0),
      game("g3", "f", "e", 1, 0), game("g4", "h", "g", 1, 0),
    ];
    // equal ratings -> 50%, so nothing qualifies as an upset at all
    expect(buildUpsets(dataset(teams, games), "MHSAA", { rate, today: TODAY })).toEqual([]);
  });

  it("separates the two leagues", () => {
    const teams = [
      team("giant", "7A"), team("tiny", "7A"),
      team("mais-giant", "MAIS-4A"), team("mais-small", "MAIS-4A"),
    ];
    const data = dataset(teams, [
      game("mhsaa", "tiny", "giant", 21, 14),
      game("mais", "mais-small", "mais-giant", 21, 14),
    ]);
    expect(buildUpsets(data, "MHSAA", { rate, today: TODAY }).map((u) => u.gameId)).toEqual(["mhsaa"]);
    expect(buildUpsets(data, "MAIS", { rate, today: TODAY }).map((u) => u.gameId)).toEqual(["mais"]);
  });

  it("excludes 8-Man games entirely", () => {
    // 8-Man ratings aren't comparable with the 11-man game, so a cross-code
    // result must not surface as an upset in either league's list.
    const teams = [team("giant", "MAIS-4A"), team("tiny", "MAIS-8M-2A")];
    const data = dataset(teams, [game("g1", "tiny", "giant", 21, 14)]);
    expect(buildUpsets(data, "MAIS", { rate, today: TODAY })).toEqual([]);
    // ...and an all-8-Man game is likewise absent.
    const both = [team("giant", "MAIS-8M-1A"), team("tiny", "MAIS-8M-2A")];
    const d2 = dataset(both, [game("g2", "tiny", "giant", 21, 14)]);
    expect(buildUpsets(d2, "MAIS", { rate, today: TODAY })).toEqual([]);
  });

  it("skips ties and unresolvable opponents", () => {
    const teams = [team("giant", "7A"), team("tiny", "7A")];
    const tie = dataset(teams, [game("t", "tiny", "giant", 14, 14)]);
    expect(buildUpsets(tie, "MHSAA", { rate, today: TODAY })).toEqual([]);
    const unknown = dataset(teams, [game("u", "tiny", "not-a-team", 21, 14)]);
    expect(buildUpsets(unknown, "MHSAA", { rate, today: TODAY })).toEqual([]);
  });
});
