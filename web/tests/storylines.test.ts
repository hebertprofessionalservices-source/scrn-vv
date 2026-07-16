import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { playoffOddsForGame } from "@/lib/standings";
import { buildStorylines } from "@/lib/storylines";
import type { Game, Player, Team } from "@/lib/types";

function makeTeam(
  id: string,
  district: string | null,
  opts: Partial<{
    wins: number; losses: number; pf: number; pa: number;
    streak: Team["streak"]; regionRecord: Team["regionRecord"];
  }> = {},
): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "1A", district,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins: opts.wins ?? 0, losses: opts.losses ?? 0 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: opts.pf ?? 0, pointsAgainst: opts.pa ?? 0,
      yardsFor: 0, yardsAgainst: 0, passYdsFor: 0, rushYdsFor: 0,
      passYdsAgainst: 0, rushYdsAgainst: 0, turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
    streak: opts.streak ?? null,
    regionRecord: opts.regionRecord ?? null,
  };
}

function makeGame(
  id: string, homeTeamId: string, awayTeamId: string,
  hs: number | null, as_: number | null, date: string,
): Game {
  return {
    id, season: "2025-26", week: 1, date, homeTeamId, awayTeamId,
    homeScore: hs, awayScore: as_, quarterScores: { home: [], away: [] },
    status: hs === null ? "scheduled" : "final",
    dataStatus: "missing", venue: null, boxScore: null,
    maxprepsUrl: `https://www.maxpreps.com/g?c=${id}`,
  };
}

const players: Player[] = [];

describe("playoffOddsForGame", () => {
  const D = "1A Region 1";
  const teams = [
    makeTeam("a", D, { wins: 5, losses: 1, pf: 200, pa: 100 }),
    makeTeam("b", D, { wins: 4, losses: 2, pf: 180, pa: 120 }),
    makeTeam("c", D, { wins: 3, losses: 3, pf: 150, pa: 150 }),
    makeTeam("d", D, { wins: 2, losses: 4, pf: 120, pa: 180 }),
    makeTeam("e", D, { wins: 1, losses: 5, pf: 100, pa: 200 }),
    makeTeam("f", D, { wins: 0, losses: 6, pf: 60, pa: 260 }),
  ];
  const games = [
    makeGame("p1", "a", "f", 40, 0, "2025-09-05"),
    makeGame("p2", "b", "e", 30, 10, "2025-09-05"),
    makeGame("p3", "c", "d", 20, 14, "2025-09-05"),
    makeGame("f1", "a", "b", null, null, "2025-10-24"),
    makeGame("f2", "c", "f", null, null, "2025-10-24"),
    makeGame("f3", "d", "e", null, null, "2025-10-24"),
  ];

  it("winning strictly improves a team's playoff odds", () => {
    const data = buildDataset({ teams, players, games });
    const odds = playoffOddsForGame(data, "a", "b", new Date("2025-10-20"));
    expect(odds).not.toBeNull();
    const aWin = odds!.ifTeamWins.get("a")!;
    const aLoss = odds!.ifTeamLoses.get("a")!;
    expect(aWin).toBeGreaterThanOrEqual(aLoss);
    const bWhenAWins = odds!.ifTeamWins.get("b")!;
    const bWhenBWins = odds!.ifTeamLoses.get("b")!;
    expect(bWhenBWins).toBeGreaterThanOrEqual(bWhenAWins);
  });

  it("returns null when no game between the teams remains", () => {
    const data = buildDataset({ teams, players, games });
    expect(playoffOddsForGame(data, "a", "c", new Date("2025-10-20"))).toBeNull();
  });

  it("returns null for cross-district matchups", () => {
    const other = makeTeam("x", "1A Region 2");
    const data = buildDataset({
      teams: [...teams, other], players,
      games: [...games, makeGame("f9", "a", "x", null, null, "2025-10-24")],
    });
    expect(playoffOddsForGame(data, "a", "x", new Date("2025-10-20"))).toBeNull();
  });
});

describe("buildStorylines", () => {
  it("emits streak, undefeated, and first-place bullets from real fields", () => {
    const D = "1A Region 1";
    const a = makeTeam("alpha", D, {
      wins: 8, losses: 0, pf: 320, pa: 60,
      streak: { count: 8, result: "W" },
      regionRecord: { wins: 3, losses: 0 },
    });
    const b = makeTeam("bravo", D, {
      wins: 7, losses: 1, pf: 280, pa: 90,
      regionRecord: { wins: 3, losses: 0 },
    });
    const filler = ["c1", "c2", "c3", "c4"].map((id, i) =>
      makeTeam(id, D, { wins: 2, losses: 6, pf: 100, pa: 200 + i, regionRecord: { wins: 0, losses: 3 } }),
    );
    const games = [
      makeGame("g1", "alpha", "c1", 40, 0, "2025-09-05"),
      makeGame("gf", "alpha", "bravo", null, null, "2025-10-31"),
    ];
    const data = buildDataset({ teams: [a, b, ...filler], players, games });
    const lines = buildStorylines(data, a, b, [], new Date("2025-10-20"));
    expect(lines.some((l) => l.includes("won 8 in a row"))).toBe(true);
    expect(lines.some((l) => l.includes("perfect 8–0"))).toBe(true);
    expect(lines.some((l) => l.includes("sole possession of first place"))).toBe(true);
    expect(lines.some((l) => l.includes("playoff chances"))).toBe(true);
  });

  it("emits last-meeting bullet from head-to-head finals", () => {
    const a = makeTeam("alpha", null, { wins: 1 });
    const b = makeTeam("bravo", null, { wins: 1 });
    const g = makeGame("m1", "alpha", "bravo", 28, 14, "2025-10-03");
    const data = buildDataset({ teams: [a, b], players, games: [g] });
    const lines = buildStorylines(data, a, b, [g], new Date("2026-07-01"));
    expect(lines.some((l) => l.includes("took the last meeting 28–14"))).toBe(true);
  });
});
