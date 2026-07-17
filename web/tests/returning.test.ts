import { describe, expect, it } from "vitest";
import { adjustPriorRatings, returningShares } from "@/lib/returning";
import type { PowerRank } from "@/lib/power";
import type { Player } from "@/lib/types";

function player(
  teamId: string,
  cls: Player["class"],
  yds: number,
  tackles = 0,
): Player {
  return {
    id: `${teamId}-${cls}-${yds}-${tackles}-${Math.random()}`,
    teamId,
    season: "2025-26",
    name: "P",
    jersey: null,
    position: "ATH",
    class: cls,
    height: null,
    weight: null,
    stats: {
      passing: { att: 0, cmp: 0, yds: 0, td: 0, int: 0, rating: 0 },
      rushing: { att: 0, yds, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
    gamesPlayed: 10,
  };
}

describe("returningShares", () => {
  it("computes the non-senior share of production", () => {
    const players = [
      player("t", "SR", 750),  // graduates
      player("t", "JR", 250),  // returns
    ];
    expect(returningShares(players).get("t")).toBeCloseTo(0.25, 5);
  });

  it("weights defensive production via tackles", () => {
    const players = [
      player("t", "SR", 0, 50),  // 400 production, graduates
      player("t", "SO", 0, 50),  // 400 production, returns
    ];
    expect(returningShares(players).get("t")).toBeCloseTo(0.5, 5);
  });

  it("returns null when total production is too small to trust", () => {
    const players = [player("t", "SR", 50), player("t", "JR", 50)];
    expect(returningShares(players).get("t")).toBeNull();
  });
});

describe("adjustPriorRatings", () => {
  const power = new Map<string, PowerRank>([
    ["a", { rating: 20, overallRank: 1, classRank: 1, source: "current" }],
    ["b", { rating: 10, overallRank: 2, classRank: 2, source: "current" }],
    ["c", { rating: -5, overallRank: 3, classRank: 3, source: "current" }],
  ]);

  it("scales ratings toward league average by returning share", () => {
    const adjusted = adjustPriorRatings(
      power,
      new Map([["a", 0.25], ["b", 1], ["c", 0.5]]),
    );
    expect(adjusted.get("a")).toBe(5);     // lost 75% of production
    expect(adjusted.get("b")).toBe(10);    // returns everything
    expect(adjusted.get("c")).toBe(-2.5);  // bad team regresses up toward 0
  });

  it("applies the median known discount when a team's share is unknown", () => {
    const adjusted = adjustPriorRatings(
      power,
      new Map([["a", 0.5], ["b", null], ["c", 0.5]]),
    );
    expect(adjusted.get("a")).toBe(10);
    expect(adjusted.get("b")).toBe(5); // median of known shares (0.5)
  });
});
