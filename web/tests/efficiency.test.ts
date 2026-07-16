import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildTeamEfficiency } from "@/lib/efficiency";
import type { BoxScore, Game, Player, Team } from "@/lib/types";

function makeTeam(
  id: string,
  opts: Partial<{ wins: number; losses: number; pf: number; pa: number; passYds: number; rushYds: number }> = {},
): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "1A", district: null,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins: opts.wins ?? 5, losses: opts.losses ?? 5 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: opts.pf ?? 0, pointsAgainst: opts.pa ?? 0,
      yardsFor: (opts.passYds ?? 0) + (opts.rushYds ?? 0),
      yardsAgainst: 0,
      passYdsFor: opts.passYds ?? 0, rushYdsFor: opts.rushYds ?? 0,
      passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function makePlayer(
  id: string, teamId: string, name: string,
  opts: Partial<{ rushAtt: number; passAtt: number }> = {},
): Player {
  return {
    id, teamId, season: "2025-26", name, jersey: "1", position: "ATH",
    class: "SR", height: null, weight: null, gamesPlayed: 10,
    stats: {
      passing: { att: opts.passAtt ?? 0, cmp: 0, yds: 0, td: 0, int: 0, rating: 0 },
      rushing: { att: opts.rushAtt ?? 0, yds: 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
  };
}

function makeGame(id: string, homeTeamId: string, awayTeamId: string, box: BoxScore | null): Game {
  return {
    id, season: "2025-26", week: 1, date: "2025-09-05", homeTeamId, awayTeamId,
    homeScore: 21, awayScore: 14, quarterScores: { home: [], away: [] },
    status: "final", dataStatus: box ? "complete" : "missing",
    venue: null, boxScore: box, maxprepsUrl: `https://www.maxpreps.com/g?c=${id}`,
  };
}

function entry(playerId: string, yds: number, att?: number) {
  return { playerId, yds, att: att ?? null };
}

describe("buildTeamEfficiency", () => {
  it("computes offensive per-play stats from team yards + roster attempts", () => {
    const t = makeTeam("a", { wins: 10, losses: 0, pf: 350, passYds: 2000, rushYds: 1000 });
    const p1 = makePlayer("p1", "a", "Q Back", { passAtt: 200 });
    const p2 = makePlayer("p2", "a", "R Back", { rushAtt: 300 });
    const eff = buildTeamEfficiency(buildDataset({ teams: [t], players: [p1, p2], games: [] }));
    const e = eff.get("a")!;
    expect(e.offPpg).toBe(35);
    expect(e.offYdsPerPass).toBe(10);
    expect(e.offYdsPerRush).toBeCloseTo(3.333, 2);
    expect(e.offYdsPerPlay).toBe(6);
  });

  it("solves defense from opponents' attributed box-score output", () => {
    const a = makeTeam("a", { wins: 1, losses: 0 });
    const b = makeTeam("b", { wins: 0, losses: 1 });
    const players = [
      makePlayer("pa", "a", "Alan Alpha"),
      makePlayer("pb", "b", "Bob Bravo"),
    ];
    const box: BoxScore = {
      passing: [entry("Alan Alpha(Sr)", 150, 20), entry("B. Bravo(Jr)", 90, 15)],
      rushing: [entry("Alan Alpha(Sr)", 100), entry("Bob Bravo(Jr)", 60)],
      receiving: [], defense: [],
    };
    const eff = buildTeamEfficiency(
      buildDataset({ teams: [a, b], players, games: [makeGame("g1", "a", "b", box)] }),
    );
    // Team a's defense faced Bob Bravo: 90 pass + 60 rush = 150 yds.
    expect(eff.get("a")!.defYdsPerGame).toBe(150);
    expect(eff.get("a")!.defYdsPerPass).toBe(6);
    // Team b's defense faced Alan Alpha: 150 + 100 = 250 yds.
    expect(eff.get("b")!.defYdsPerGame).toBe(250);
    expect(eff.get("b")!.defCoverage).toEqual({ covered: 1, games: 1 });
  });

  it("skips games with too much unattributed yardage", () => {
    const a = makeTeam("a", { wins: 1, losses: 0 });
    const b = makeTeam("b", { wins: 0, losses: 1 });
    const box: BoxScore = {
      passing: [entry("Total Stranger(Sr)", 300, 30)],
      rushing: [], receiving: [], defense: [],
    };
    const eff = buildTeamEfficiency(
      buildDataset({ teams: [a, b], players: [], games: [makeGame("g1", "a", "b", box)] }),
    );
    expect(eff.get("a")!.defYdsPerGame).toBeNull();
    expect(eff.get("a")!.defCoverage.covered).toBe(0);
  });

  it("gives the stronger offense a higher offensive index", () => {
    const strong = makeTeam("strong", { wins: 10, losses: 0, pf: 400, passYds: 2500, rushYds: 1500 });
    const weak = makeTeam("weak", { wins: 0, losses: 10, pf: 100, passYds: 800, rushYds: 700 });
    const players = [
      makePlayer("s1", "strong", "S One", { passAtt: 200, rushAtt: 300 }),
      makePlayer("w1", "weak", "W One", { passAtt: 200, rushAtt: 300 }),
    ];
    const eff = buildTeamEfficiency(buildDataset({ teams: [strong, weak], players, games: [] }));
    expect(eff.get("strong")!.offIndex!).toBeGreaterThan(eff.get("weak")!.offIndex!);
    expect(eff.get("strong")!.offIndex).toBe(100);
    expect(eff.get("weak")!.offIndex).toBe(0);
  });

  it("falls back to Def PPG alone when box-score coverage is thin", () => {
    const a = makeTeam("a", { wins: 5, losses: 5, pa: 100 });
    const b = makeTeam("b", { wins: 5, losses: 5, pa: 300 });
    const eff = buildTeamEfficiency(buildDataset({ teams: [a, b], players: [], games: [] }));
    expect(eff.get("a")!.defIndex).toBe(100); // fewer points allowed
    expect(eff.get("b")!.defIndex).toBe(0);
  });
});
