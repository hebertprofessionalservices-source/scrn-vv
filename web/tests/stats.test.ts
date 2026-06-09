import { describe, expect, it } from "vitest";
import { topPlayersByStat, topDefensesByPPG } from "@/lib/stats";
import type { Player, Team } from "@/lib/types";

function mkPlayer(overrides: Partial<Player>): Player {
  return {
    id: overrides.id ?? "x", teamId: overrides.teamId ?? "x",
    season: "2025-26", name: overrides.name ?? "X",
    jersey: "1", position: overrides.position ?? "QB", class: "SR",
    height: null, weight: null, gamesPlayed: 10,
    stats: overrides.stats ?? {
      passing: { att: 0, cmp: 0, yds: 0, td: 0, int: 0, rating: 0 },
      rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
    ...overrides,
  } as Player;
}

describe("topPlayersByStat", () => {
  it("ranks QBs by passing yards desc", () => {
    const players = [
      mkPlayer({ id: "a", name: "A", position: "QB",
        stats: { passing: { att: 0, cmp: 0, yds: 100, td: 0, int: 0, rating: 0 },
          rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
          receiving: { rec: 0, yds: 0, td: 0 },
          defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
          kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 } } }),
      mkPlayer({ id: "b", name: "B", position: "QB",
        stats: { passing: { att: 0, cmp: 0, yds: 300, td: 0, int: 0, rating: 0 },
          rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
          receiving: { rec: 0, yds: 0, td: 0 },
          defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
          kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 } } }),
    ];
    const top = topPlayersByStat(players, "QB", (p) => p.stats.passing.yds, 3);
    expect(top.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("excludes players with zero in the target stat", () => {
    const players = [mkPlayer({ id: "a", position: "QB" })];
    expect(topPlayersByStat(players, "QB", (p) => p.stats.passing.yds, 3)).toHaveLength(0);
  });
});

describe("topDefensesByPPG", () => {
  const teams: Team[] = [
    { id: "t1", name: "A", mascot: null, city: null, classification: "7A",
      district: null, logoUrl: null, colors: { primary: null, secondary: null },
      season: "2025-26", record: { wins: 5, losses: 0 },
      rankings: { stateOverall: null, stateClass: null, national: null },
      stats: { pointsFor: 0, pointsAgainst: 50, yardsFor: 0, yardsAgainst: 0,
        passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
        turnoversForced: 0, turnoversLost: 0 },
      headCoach: null, maxprepsUrl: null },
    { id: "t2", name: "B", mascot: null, city: null, classification: "7A",
      district: null, logoUrl: null, colors: { primary: null, secondary: null },
      season: "2025-26", record: { wins: 5, losses: 0 },
      rankings: { stateOverall: null, stateClass: null, national: null },
      stats: { pointsFor: 0, pointsAgainst: 100, yardsFor: 0, yardsAgainst: 0,
        passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
        turnoversForced: 0, turnoversLost: 0 },
      headCoach: null, maxprepsUrl: null },
  ];
  it("ranks by lowest points allowed per game", () => {
    const ranked = topDefensesByPPG(teams, 3);
    expect(ranked[0].team.id).toBe("t1");
    expect(ranked[0].ppg).toBe(10);
  });
});
