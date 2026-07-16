import { describe, expect, it } from "vitest";
import { buildLeaderboardData, rankLeaders } from "@/lib/leaderboard";
import type { Player, Team } from "@/lib/types";

function makeTeam(id: string, classification: Team["classification"]): Team {
  return {
    id, name: id, mascot: null, city: null, classification, district: null,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins: 5, losses: 5 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: 200, pointsAgainst: 100, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function makeQB(id: string, teamId: string, yds: number, td: number): Player {
  return {
    id, teamId, season: "2025-26", name: id, jersey: "1", position: "QB",
    class: "SR", height: null, weight: null, gamesPlayed: 10,
    stats: {
      passing: { att: 100, cmp: 60, yds, td, int: 2, rating: 100 },
      rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
  };
}

describe("buildLeaderboardData", () => {
  const teams = [makeTeam("t7", "7A"), makeTeam("t1", "1A")];

  it("keeps TD leaders even when they are outside the yardage top 10", () => {
    // 10 yardage leaders with 0 TDs, plus one low-yardage player with many TDs.
    const players = [
      ...Array.from({ length: 10 }, (_, i) => makeQB(`y${i}`, "t7", 2000 - i, 0)),
      makeQB("tdguy", "t7", 100, 30),
    ];
    const data = buildLeaderboardData(teams, players);
    const ids = data.positions.QB.map((e) => e.id);
    expect(ids).toContain("tdguy");
    const byTd = rankLeaders(data.positions.QB, "td", "QB");
    expect(byTd[0].id).toBe("tdguy");
  });

  it("requires minimum attempts for the efficiency leaderboard", () => {
    // 200 att · perfect-rating small-sample QB should not qualify (att < 50).
    const lowVol = makeQB("lowvol", "t7", 300, 3);
    lowVol.stats.passing.att = 10;
    lowVol.stats.passing.rating = 158.3;
    const highVol = makeQB("highvol", "t7", 2000, 20);
    highVol.stats.passing.att = 200;
    highVol.stats.passing.rating = 110;
    const data = buildLeaderboardData(teams, [lowVol, highVol]);
    const byEff = rankLeaders(data.positions.QB, "eff", "QB");
    expect(byEff.map((e) => e.id)).toEqual(["highvol"]);
  });

  it("computes yards per game", () => {
    const data = buildLeaderboardData(teams, [makeQB("a", "t7", 1000, 10)]);
    const byYpg = rankLeaders(data.positions.QB, "ypg", "QB");
    expect(byYpg[0].ypg).toBe(100); // 1000 yds / 10 games
  });

  it("filters by classification via entry metadata", () => {
    const players = [makeQB("a", "t7", 500, 5), makeQB("b", "t1", 400, 4)];
    const data = buildLeaderboardData(teams, players);
    const onlY1A = data.positions.QB.filter((e) => e.classification === "1A");
    expect(onlY1A.map((e) => e.id)).toEqual(["b"]);
  });

  it("orders classes canonically and computes defense PPG", () => {
    const data = buildLeaderboardData(teams, []);
    expect(data.classes).toEqual(["7A", "1A"]);
    expect(data.defenses[0].ppg).toBe(10);
  });

  it("excludes players with zero yards and zero TDs", () => {
    const data = buildLeaderboardData(teams, [makeQB("zero", "t7", 0, 0)]);
    expect(data.positions.QB).toHaveLength(0);
  });
});
