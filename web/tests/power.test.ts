import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildPowerRankings } from "@/lib/power";
import type { Game, Team } from "@/lib/types";

function makeTeam(
  id: string,
  classification: Team["classification"] = "1A",
  district: string | null = null,
  rankings: Partial<Team["rankings"]> = {},
  state = "ms",
): Team {
  return {
    id, name: id, mascot: null, city: null, classification, district,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins: 0, losses: 0 },
    rankings: { stateOverall: null, stateClass: null, national: null, ...rankings },
    stats: {
      pointsFor: 0, pointsAgainst: 0, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null,
    maxprepsUrl: `https://www.maxpreps.com/${state}/town/${id}/football/`,
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

describe("buildPowerRankings — displayed ranks", () => {
  it("takes both ranks straight from MaxPreps, not from the rating order", () => {
    // a is far stronger on the field, but MaxPreps has b ahead. MaxPreps wins:
    // the displayed rank is theirs, never a re-derivation of ours.
    const teams = [
      makeTeam("a", "7A", null, { stateOverall: 9, stateClass: 4 }),
      makeTeam("b", "7A", null, { stateOverall: 2, stateClass: 1 }),
    ];
    const games = [makeGame("g1", "a", "b", 56, 0)];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("a")!.overallRank).toBe(9);
    expect(ranks.get("a")!.classRank).toBe(4);
    expect(ranks.get("b")!.overallRank).toBe(2);
    expect(ranks.get("b")!.classRank).toBe(1);
    // Both still carry a rating for the probability features. Note the rating
    // is NOT asserted to follow the scoreline: MaxPreps' order is blended in
    // at 70%, so it drives the rating as well as the displayed rank.
    expect(typeof ranks.get("a")!.rating).toBe("number");
    expect(typeof ranks.get("b")!.rating).toBe("number");
  });

  it("leaves a team MaxPreps does not rank without a rank", () => {
    const teams = [
      makeTeam("a", "7A", null, { stateOverall: 1, stateClass: 1 }),
      makeTeam("b", "7A"),
    ];
    const games = [makeGame("g1", "a", "b", 28, 7)];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("b")!.overallRank).toBeNull();
    expect(ranks.get("b")!.classRank).toBeNull();
    // It still carries a rating, so win probability keeps working.
    expect(typeof ranks.get("b")!.rating).toBe("number");
  });

  it("suppresses ranks for out-of-state schools", () => {
    // MaxPreps ranks each team in its own state's pool, so a Louisiana
    // academy's "No. 3" is a Louisiana rank and cannot be printed beside
    // Mississippi ones.
    const teams = [
      makeTeam("ms-team", "MAIS-4A", null, { stateOverall: 5, stateClass: 3 }),
      makeTeam("la-team", "MAIS-4A", null, { stateOverall: 3, stateClass: 1 }, "la"),
    ];
    const games = [makeGame("g1", "ms-team", "la-team", 21, 14)];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("ms-team")!.classRank).toBe(3);
    expect(ranks.get("la-team")!.overallRank).toBeNull();
    expect(ranks.get("la-team")!.classRank).toBeNull();
  });

  it("shows a rank for a team with no rating", () => {
    // Oxford's only final was against an out-of-state school that is not in
    // the dataset, so that game is skipped and Oxford has no rating. Its rank
    // is MaxPreps' and does not depend on ours, so it must still show.
    const teams = [makeTeam("oxford", "7A", null, { stateOverall: 7, stateClass: 6 })];
    const games = [makeGame("g1", "oxford", "out-of-state-school", 34, 24)];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("oxford")!.overallRank).toBe(7);
    expect(ranks.get("oxford")!.classRank).toBe(6);
    expect(ranks.get("oxford")!.rating).toBeNull();
  });

  it("reaches back to no prior season at all", () => {
    // A prior-rating map used to carry teams with no current games onto the
    // board. 2026 shows 2026 only, so a team that has not played is absent.
    const teams = [makeTeam("a"), makeTeam("idle")];
    const prior = new Map([["idle", 40]]);
    const ranks = buildPowerRankings(
      buildDataset({ teams, players: [], games: [] }, "2026-27", prior),
    );
    expect(ranks.has("idle")).toBe(false);
    expect(ranks.has("a")).toBe(false);
  });

  it("ignores a prior rating for a team that has played", () => {
    const teams = [makeTeam("a"), makeTeam("b")];
    const games = [makeGame("g1", "a", "b", 28, 7)];
    const prior = new Map([["a", -50], ["b", 50]]);
    const withPrior = buildPowerRankings(
      buildDataset({ teams, players: [], games }, "2026-27", prior),
    );
    const noPrior = buildPowerRankings(
      buildDataset({ teams, players: [], games }, "2026-27"),
    );
    expect(withPrior.get("a")!.rating).toBe(noPrior.get("a")!.rating);
    expect(withPrior.get("b")!.rating).toBe(noPrior.get("b")!.rating);
  });
});

describe("buildPowerRankings — rating", () => {
  it("rates a dominant team above a winless one", () => {
    const teams = [makeTeam("a"), makeTeam("b"), makeTeam("c")];
    const games = [
      makeGame("g1", "a", "b", 35, 7),
      makeGame("g2", "a", "c", 42, 0),
      makeGame("g3", "b", "c", 21, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("a")!.rating!).toBeGreaterThan(ranks.get("b")!.rating!);
    expect(ranks.get("b")!.rating!).toBeGreaterThan(ranks.get("c")!.rating!);
  });

  it("rewards strength of schedule", () => {
    // x and y both 1-1, but x's win came against the stronger opponent pool.
    const teams = ["x", "y", "s1", "s2", "w1", "w2"].map((id) => makeTeam(id));
    const games = [
      makeGame("g1", "s1", "w1", 42, 0),
      makeGame("g2", "s2", "w2", 42, 0),
      makeGame("g3", "x", "s1", 21, 14),
      makeGame("g4", "s2", "x", 21, 14),
      makeGame("g5", "y", "w1", 21, 14),
      makeGame("g6", "w2", "y", 21, 14),
    ];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.get("x")!.rating!).toBeGreaterThan(ranks.get("y")!.rating!);
  });

  it("skips teams with no games", () => {
    const teams = [makeTeam("a", "7A"), makeTeam("b", "7A"), makeTeam("idle", "7A")];
    const games = [makeGame("g1", "a", "b", 28, 7)];
    const ranks = buildPowerRankings(buildDataset({ teams, players: [], games }));
    expect(ranks.has("idle")).toBe(false);
  });
});
