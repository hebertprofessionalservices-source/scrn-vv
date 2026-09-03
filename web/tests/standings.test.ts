import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildStandings, matchupPlayoffOutlook } from "@/lib/standings";
import type { Game, Player, Team } from "@/lib/types";

function makeTeam(
  id: string,
  district: string | null,
  wins = 0,
  losses = 0,
  pf = 0,
  pa = 0,
): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "1A", district,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins, losses },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: pf, pointsAgainst: pa, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function makeGame(
  id: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number | null,
  awayScore: number | null,
  date: string,
  status: Game["status"] = homeScore === null ? "scheduled" : "final",
): Game {
  return {
    id, season: "2025-26", week: 1, date, homeTeamId, awayTeamId,
    homeScore, awayScore, quarterScores: { home: [], away: [] },
    status, dataStatus: "missing", venue: null, boxScore: null,
    maxprepsUrl: `https://www.maxpreps.com/g?c=${id}`,
  };
}

const players: Player[] = [];

describe("buildStandings", () => {
  it("derives region records from intra-district games only", () => {
    const teams = [
      makeTeam("a", "1A Region 1", 2, 0),
      makeTeam("b", "1A Region 1", 1, 1),
      makeTeam("c", "1A Region 2", 0, 2),
    ];
    const games = [
      makeGame("g1", "a", "b", 28, 14, "2025-09-05"), // region game: a beats b
      makeGame("g2", "b", "c", 21, 7, "2025-09-12"),  // cross-region: excluded
    ];
    const data = buildDataset({ teams, players, games });
    const standings = buildStandings(data, new Date("2026-07-01"));
    const r1 = standings.regions.find((r) => r.district === "1A Region 1")!;
    expect(r1.rows[0].name).toBe("a");
    expect(r1.rows[0].region).toEqual({ wins: 1, losses: 0 });
    expect(r1.rows[1].region).toEqual({ wins: 0, losses: 1 });
    const r2 = standings.regions.find((r) => r.district === "1A Region 2")!;
    expect(r2.rows[0].region).toEqual({ wins: 0, losses: 0 });
  });

  it("returns null playoff odds when no region games remain", () => {
    const teams = [makeTeam("a", "1A Region 1"), makeTeam("b", "1A Region 1")];
    const games = [makeGame("g1", "a", "b", 28, 14, "2025-09-05")];
    const data = buildDataset({ teams, players, games });
    const standings = buildStandings(data, new Date("2026-07-01"));
    for (const row of standings.regions[0].rows) {
      expect(row.playoffPct).toBeNull();
    }
  });

  it("computes playoff odds when region games remain", () => {
    // 6-team region, 5 undecided future games: strong team should be near
    // 100%, weak team near 0 with 4 playoff spots.
    const teams = [
      makeTeam("strong", "1A Region 1", 8, 0, 400, 80),
      makeTeam("t2", "1A Region 1", 5, 3, 240, 200),
      makeTeam("t3", "1A Region 1", 5, 3, 230, 210),
      makeTeam("t4", "1A Region 1", 4, 4, 220, 220),
      makeTeam("t5", "1A Region 1", 3, 5, 200, 240),
      makeTeam("weak", "1A Region 1", 0, 8, 60, 420),
    ];
    const games = [
      // Played region games establish current region standings AND the
      // SOS-adjusted ratings that drive the simulation's win probabilities.
      makeGame("p1", "strong", "weak", 48, 0, "2025-09-05"),
      makeGame("p2", "t2", "t5", 28, 14, "2025-09-05"),
      makeGame("p3", "t3", "t4", 21, 20, "2025-09-12"),
      makeGame("p4", "t4", "weak", 35, 7, "2025-09-19"),
      makeGame("p5", "strong", "t4", 42, 7, "2025-09-26"),
      // Remaining region games (future).
      makeGame("f1", "strong", "t2", null, null, "2025-10-24"),
      makeGame("f2", "t3", "weak", null, null, "2025-10-24"),
      makeGame("f3", "t4", "t5", null, null, "2025-10-24"),
      makeGame("f4", "strong", "t3", null, null, "2025-10-31"),
      makeGame("f5", "t2", "weak", null, null, "2025-10-31"),
    ];
    const data = buildDataset({ teams, players, games });
    const standings = buildStandings(data, new Date("2025-10-20"));
    const rows = standings.regions[0].rows;
    const get = (n: string) => rows.find((r) => r.name === n)!.playoffPct!;
    expect(get("strong")).toBeGreaterThan(90);
    // Ratings are shrunk by sample size, and "weak" has only two games on
    // record here, so the model is deliberately less certain than it used to
    // be. What must hold is that it is clearly last and well below the field.
    expect(get("weak")).toBeLessThan(30);
    expect(get("weak")).toBeLessThan(get("t5"));
    for (const r of rows) expect(r.playoffPct).not.toBeNull();
  });

  it("marks teams without a district as n/a region", () => {
    const teams = [makeTeam("indep", null, 3, 2)];
    const data = buildDataset({ teams, players, games: [] });
    const standings = buildStandings(data, new Date("2026-07-01"));
    expect(standings.regions[0].rows[0].region).toBeNull();
    expect(standings.regions[0].rows[0].playoffPct).toBeNull();
  });

  it("matchup outlook: region rivals get exact win/loss conditioning", () => {
    const teams = [
      makeTeam("a", "1A Region 1", 2, 0),
      makeTeam("b", "1A Region 1", 1, 1),
      makeTeam("c", "1A Region 1", 1, 1),
      makeTeam("d", "1A Region 1", 0, 2),
      makeTeam("e", "1A Region 1", 0, 2),
    ];
    const games = [
      makeGame("p1", "a", "b", 28, 14, "2025-09-05"),
      makeGame("p2", "c", "d", 21, 7, "2025-09-05"),
      makeGame("p3", "b", "e", 28, 7, "2025-09-12"),
      makeGame("f1", "b", "c", null, null, "2025-10-24"),
      makeGame("f2", "a", "d", null, null, "2025-10-24"),
      makeGame("f3", "d", "e", null, null, "2025-10-31"),
    ];
    const data = buildDataset({ teams, players, games });
    const outlook = matchupPlayoffOutlook(data, "b", "c", new Date("2025-10-20"))!;
    expect(outlook).not.toBeNull();
    for (const side of [outlook.a, outlook.b]) {
      expect(side.current).not.toBeNull();
      expect(side.ifWin!).toBeGreaterThanOrEqual(side.ifLoss!);
      expect(side.ifWin!).toBeGreaterThanOrEqual(side.current!);
      expect(side.ifLoss!).toBeLessThanOrEqual(side.current!);
    }
  });

  it("matchup outlook: non-region games shift odds through the rating", () => {
    const teams = [
      makeTeam("a", "1A Region 1", 1, 0),
      makeTeam("b", "1A Region 1", 0, 1),
      makeTeam("x", "1A Region 2", 1, 0),
      makeTeam("y", "1A Region 2", 0, 1),
    ];
    const games = [
      makeGame("p1", "a", "b", 28, 14, "2025-09-05"),
      makeGame("p2", "x", "y", 21, 7, "2025-09-05"),
      makeGame("f1", "b", "a", null, null, "2025-10-24"),
      makeGame("f2", "y", "x", null, null, "2025-10-24"),
    ];
    const data = buildDataset({ teams, players, games });
    // a (Region 1) vs x (Region 2): no shared region game exists.
    const outlook = matchupPlayoffOutlook(data, "a", "x", new Date("2025-10-20"))!;
    expect(outlook).not.toBeNull();
    for (const side of [outlook.a, outlook.b]) {
      expect(side.current).not.toBeNull();
      expect(side.ifWin!).toBeGreaterThanOrEqual(side.ifLoss!);
    }
  });

  it("prefers official (scraped) region records over derived ones", () => {
    const a = makeTeam("a", "1A Region 1", 2, 0);
    a.regionRecord = { wins: 3, losses: 1 };
    const b = makeTeam("b", "1A Region 1", 0, 2);
    const games = [makeGame("g1", "a", "b", 28, 14, "2025-09-05")];
    const data = buildDataset({ teams: [a, b], players, games });
    const standings = buildStandings(data, new Date("2026-07-01"));
    const rowA = standings.regions[0].rows.find((r) => r.name === "a")!;
    expect(rowA.region).toEqual({ wins: 3, losses: 1 });
    expect(rowA.regionSource).toBe("official");
  });
});
