import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildRatings } from "@/lib/standings";
import {
  gameWinProbability,
  nextScheduledGame,
  regionStanding,
  strengthOfSchedule,
} from "@/lib/team-outlook";
import { ordinal, recordsBlockLines } from "@/lib/matchup-format";
import type { Game, Player, Team } from "@/lib/types";

function makeTeam(id: string, district: string | null = "1A Region 1", wins = 0, losses = 0): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "1A", district,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2025-26",
    record: { wins, losses },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: 0, pointsAgainst: 0, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function makeGame(
  id: string, home: string, away: string,
  hs: number | null, as_: number | null, date: string,
): Game {
  return {
    id, season: "2025-26", week: 1, date, homeTeamId: home, awayTeamId: away,
    homeScore: hs, awayScore: as_, quarterScores: { home: [], away: [] },
    status: hs === null ? "scheduled" : "final", dataStatus: "missing",
    venue: null, boxScore: null, maxprepsUrl: `https://www.maxpreps.com/g?c=${id}`,
  };
}

const players: Player[] = [];

describe("ordinal", () => {
  it("formats places", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st"],
    );
  });
});

describe("regionStanding", () => {
  it("ranks by region record", () => {
    const teams = [
      makeTeam("a", "1A Region 1", 2, 0),
      makeTeam("b", "1A Region 1", 1, 1),
      makeTeam("c", "1A Region 1", 0, 2),
    ];
    const games = [
      makeGame("g1", "a", "b", 28, 14, "2025-09-05"),
      makeGame("g2", "a", "c", 28, 14, "2025-09-12"),
      makeGame("g3", "b", "c", 28, 14, "2025-09-19"),
    ];
    const data = buildDataset({ teams, players, games });
    expect(regionStanding(data, teams[0])!.place).toBe(1);
    expect(regionStanding(data, teams[1])!.place).toBe(2);
    expect(regionStanding(data, teams[2])!.place).toBe(3);
    expect(regionStanding(data, teams[2])!.size).toBe(3);
  });

  it("returns null without a district", () => {
    const t = makeTeam("indep", null);
    const data = buildDataset({ teams: [t], players, games: [] });
    expect(regionStanding(data, t)).toBeNull();
  });
});

describe("strengthOfSchedule", () => {
  it("splits played vs remaining opponents", () => {
    const teams = [makeTeam("x"), makeTeam("strong"), makeTeam("weak")];
    const games = [
      // strong beats weak big -> strong high, weak low rating
      makeGame("g1", "strong", "weak", 42, 0, "2025-09-05"),
      makeGame("g2", "x", "weak", 21, 14, "2025-09-12"),      // played: weak
      makeGame("g3", "x", "strong", null, null, "2025-10-24"), // remaining: strong
    ];
    const data = buildDataset({ teams, players, games });
    const rate = buildRatings(data);
    const sos = strengthOfSchedule(data, teams[0], rate);
    expect(sos.played).not.toBeNull();
    expect(sos.remaining).not.toBeNull();
    expect(sos.remaining!).toBeGreaterThan(sos.played!);
  });
});

describe("nextScheduledGame / gameWinProbability", () => {
  it("finds the next unplayed game and rates it", () => {
    const teams = [makeTeam("a"), makeTeam("b"), makeTeam("c")];
    const games = [
      makeGame("g1", "a", "b", 28, 7, "2025-09-05"),
      makeGame("g2", "c", "a", null, null, "2025-10-24"),
      makeGame("g3", "a", "b", null, null, "2025-11-01"),
    ];
    const data = buildDataset({ teams, players, games });
    const next = nextScheduledGame(data, teams[0], new Date("2025-10-01"))!;
    expect(next.opp.id).toBe("c");
    expect(next.isHome).toBe(false);
    const rate = buildRatings(data);
    const p = gameWinProbability(data, teams[0], next.game, rate)!;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe("recordsBlockLines", () => {
  it("renders the client-approved format", () => {
    expect(
      recordsBlockLines({
        overall: { wins: 8, losses: 2 },
        classification: { wins: 6, losses: 1 },
        region: { record: { wins: 3, losses: 2 }, place: 2 },
        home: { wins: 5, losses: 0 },
        away: { wins: 3, losses: 2 },
        neutral: null,
      }),
    ).toEqual([
      "Overall 8–2 (Region 3–2 · 2nd place)",
      "Classification 6–1",
      "Home 5–0 · Away 3–2 · Neutral 0–0",
    ]);
  });
});
