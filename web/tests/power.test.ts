import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildPowerRankings } from "@/lib/power";
import type { Game, Team } from "@/lib/types";

function makeTeam(id: string, classification: Team["classification"] = "1A"): Team {
  return {
    id, name: id, mascot: null, city: null, classification, district: null,
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
