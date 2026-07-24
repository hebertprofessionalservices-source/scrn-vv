import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildPowerRankings } from "@/lib/power";
import type { Game, Team } from "@/lib/types";

function makeTeam(
  id: string,
  classification: Team["classification"] = "1A",
  district: string | null = null,
): Team {
  return {
    id, name: id, mascot: null, city: null, classification, district,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins: 0, losses: 0 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: 0, pointsAgainst: 0, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function makeGame(id: string, homeTeamId: string, awayTeamId: string, hs: number, as_: number): Game {
  return {
    id, season: "2025-26", week: 1, date: "2025-09-05", homeTeamId, awayTeamId,
    homeScore: hs, awayScore: as_, quarterScores: { home: [], away: [] },
    status: "final", dataStatus: "missing", venue: null, boxScore: null,
    maxprepsUrl: `https://www.maxpreps.com/g?c=${id}`,
  };
}

describe("buildPowerRankings", () => {
  it("ranks a dominant team first and winless team last", () => {
    const teams = [makeTeam("a"), makeTeam("b"), makeTeam("c")];
    const games = [
      makeGame("g1", "a", "b", 35, 7),
      makeGame("g2", "a", "c", 42, 0),
      makeGame("g3", "b", "c", 21, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("a")!.overallRank).toBe(1);
    expect(ranks.get("c")!.overallRank).toBe(3);
  });

  it("rewards strength of schedule", () => {
    // x and y both 1-1, but x's win came against the stronger opponent pool.
    const teams = ["x", "y", "s1", "s2", "w1", "w2"].map((id) => makeTeam(id));
    const games = [
      // s1/s2 crush w1/w2 -> s-pool strong, w-pool weak
      makeGame("g1", "s1", "w1", 42, 0),
      makeGame("g2", "s2", "w2", 42, 0),
      // x beats strong s1 by 7, loses to s2 by 7
      makeGame("g3", "x", "s1", 21, 14),
      makeGame("g4", "s2", "x", 21, 14),
      // y beats weak w1 by 7, loses to w2 by 7
      makeGame("g5", "y", "w1", 21, 14),
      makeGame("g6", "w2", "y", 21, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("x")!.rating).toBeGreaterThan(ranks.get("y")!.rating);
  });

  it("assigns per-class ranks and skips teams with no games", () => {
    const teams = [makeTeam("a", "7A"), makeTeam("b", "7A"), makeTeam("idle", "7A")];
    const games = [makeGame("g1", "a", "b", 28, 7)];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("a")!.classRank).toBe(1);
    expect(ranks.get("b")!.classRank).toBe(2);
    expect(ranks.has("idle")).toBe(false);
  });

  it("preseason: ranks every team from prior-season ratings, labeled prior", () => {
    const teams = [makeTeam("a"), makeTeam("b"), makeTeam("c")];
    const prior = new Map([["a", 12], ["b", -3], ["c", 5]]);
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games: [] }, "2026-27", prior));
    expect(ranks.get("a")!.overallRank).toBe(1);
    expect(ranks.get("c")!.overallRank).toBe(2);
    expect(ranks.get("b")!.overallRank).toBe(3);
    for (const id of ["a", "b", "c"]) expect(ranks.get(id)!.source).toBe("prior");
  });

  it("keeps the prior rating (labeled) until a team's first region game", () => {
    // a and b share a region but have only played non-region games (vs c).
    const teams = [
      makeTeam("a", "1A", "1A Region 1"),
      makeTeam("b", "1A", "1A Region 1"),
      makeTeam("c", "1A", "1A Region 2"),
    ];
    const prior = new Map([["a", -10], ["b", 10]]);
    const games = [
      makeGame("g1", "a", "c", 28, 7),
      makeGame("g2", "b", "c", 21, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }, "2026-27", prior));
    expect(ranks.get("a")!.rating).toBe(-10);
    expect(ranks.get("a")!.source).toBe("prior");
    expect(ranks.get("b")!.source).toBe("prior");
  });

  it("drops the prior entirely after the first region game", () => {
    // b was far better last season, but current results own the rating as
    // soon as the region opener is played — zero prior bleed-through.
    const teams = [
      makeTeam("a", "1A", "1A Region 1"),
      makeTeam("b", "1A", "1A Region 1"),
    ];
    const prior = new Map([["a", -10], ["b", 10]]);
    const games = [makeGame("g1", "a", "b", 28, 7)];
    const withPrior = buildPowerRankings(
      buildDataset({ teams, players: [], games }, "2026-27", prior),
    );
    const noPrior = buildPowerRankings(buildDataset({ teams, players: [], games }, "2026-27"));
    expect(withPrior.get("a")!.rating).toBe(noPrior.get("a")!.rating);
    expect(withPrior.get("a")!.source).toBe("current");
    expect(withPrior.get("a")!.overallRank).toBe(1);
  });

  it("independents (no region) switch off the prior after 2 finals", () => {
    const teams = [makeTeam("a"), makeTeam("b"), makeTeam("c")];
    const prior = new Map([["a", -10]]);
    const one = [makeGame("g1", "a", "b", 28, 7)];
    const two = [...one, makeGame("g2", "a", "c", 28, 7)];
    const after1 = buildPowerRankings(buildDataset({ teams, players: [], games: one }, "2026-27", prior));
    const after2 = buildPowerRankings(buildDataset({ teams, players: [], games: two }, "2026-27", prior));
    expect(after1.get("a")!.source).toBe("prior");
    expect(after2.get("a")!.source).toBe("current");
  });

  it("ignores the prior for teams no longer in the dataset", () => {
    const teams = [makeTeam("a")];
    const prior = new Map([["a", 5], ["ghost", 99]]);
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games: [] }, "2026-27", prior));
    expect(ranks.has("ghost")).toBe(false);
    expect(ranks.get("a")!.overallRank).toBe(1);
  });

  it("MaxPreps state rank dominates the blend (75/25)", () => {
    // Our results say a is far better, but MaxPreps ranks b #1 and a #40;
    // the blended rating should put b on top.
    const a = makeTeam("a");
    const b = makeTeam("b");
    const c = makeTeam("c");
    a.rankings.stateOverall = 40;
    b.rankings.stateOverall = 1;
    const games = [
      makeGame("g1", "a", "b", 42, 0),
      makeGame("g2", "a", "c", 35, 7),
      makeGame("g3", "b", "c", 21, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams: [a, b, c], players: [], games }));
    expect(ranks.get("b")!.overallRank).toBe(1);
    expect(ranks.get("a")!.overallRank).toBe(2);
  });

  it("preseason: falls back to prior-season MaxPreps ranks", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    // Our prior ratings favor a; last season's MaxPreps ranks favor b.
    const prior = new Map([["a", 10], ["b", 5]]);
    const mp = new Map([["b", 1], ["a", 30]]);
    const ranks = buildPowerRankings(
      buildDataset({ teams, players: [], games: [] }, "2026-27", prior, mp),
    );
    expect(ranks.get("b")!.overallRank).toBe(1);
  });

  it("MaxPreps pools don't cross-contaminate leagues", () => {
    // A MAIS team ranked #1 in its own pool must not leapfrog MHSAA teams:
    // its pool contains only itself, so its rating is unchanged.
    const a = makeTeam("a");
    const b = makeTeam("b");
    const c = makeTeam("c");
    const m = makeTeam("m", "MAIS-8M-1A");
    m.rankings.stateClass = 1;
    const games = [
      makeGame("g1", "a", "b", 28, 7),
      makeGame("g2", "b", "c", 21, 14),
      makeGame("g3", "a", "c", 35, 0),
      makeGame("g4", "c", "m", 20, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams: [a, b, c, m], players: [], games }));
    expect(ranks.get("m")!.overallRank).toBe(4);
  });

  it("teams MaxPreps doesn't rank keep our rating alone", () => {
    const a = makeTeam("a");
    const b = makeTeam("b");
    const c = makeTeam("c");
    a.rankings.stateOverall = 1;
    b.rankings.stateOverall = 2;
    const games = [
      makeGame("g1", "a", "b", 28, 7),
      makeGame("g2", "b", "c", 21, 14),
      makeGame("g3", "a", "c", 35, 0),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams: [a, b, c], players: [], games }));
    expect(ranks.has("c")).toBe(true);
    expect(ranks.get("a")!.overallRank).toBe(1);
  });

  it("caps blowout margins", () => {
    // 100-0 should not rate higher than 28-0 against the same opponent pool.
    const teams = [makeTeam("blowout"), makeTeam("cap"), makeTeam("v1"), makeTeam("v2")];
    const games = [
      makeGame("g1", "blowout", "v1", 100, 0),
      makeGame("g2", "cap", "v2", 28, 0),
      makeGame("g3", "v1", "v2", 14, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("blowout")!.rating).toBeCloseTo(ranks.get("cap")!.rating, 5);
  });
});
