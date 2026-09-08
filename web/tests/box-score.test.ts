import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildBoxScore } from "@/lib/box-score";
import type { BoxScoreEntry, Game, Player, Team } from "@/lib/types";

function team(id: string): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "1A", district: null,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2026-27",
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

function player(id: string, teamId: string, name: string): Player {
  return {
    id, teamId, season: "2026-27", name, jersey: null, position: "QB",
    class: "JR", height: null, weight: null,
    stats: {
      passing: { att: 0, cmp: 0, yds: 0, td: 0, int: 0, rating: 0 },
      rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
    gamesPlayed: 1,
  };
}

const entry = (playerId: string, kv: Partial<BoxScoreEntry>): BoxScoreEntry => ({
  playerId, cmp: null, att: null, yds: null, td: null, int: null, rec: null,
  tackles: null, sacks: null, ff: null, fgm: null, fga: null, xpm: null, xpa: null,
  ...kv,
});

const teams = [team("home"), team("away")];
const players = [
  player("p1", "home", "Jay Long"),
  player("p2", "away", "Cal Rush"),
];

function game(over: Partial<Game> = {}): Game {
  return {
    id: "g1", season: "2026-27", week: 1, date: "2026-09-04",
    homeTeamId: "home", awayTeamId: "away", homeScore: 28, awayScore: 21,
    quarterScores: { home: [7, 14, 7, 0], away: [7, 0, 7, 7] },
    status: "final", dataStatus: "complete", venue: null,
    boxScore: {
      passing: [entry("J. Long(Sr)", { cmp: 13, att: 26, yds: 178, td: 2, int: 1 })],
      rushing: [entry("Cal Rush(Jr)", { att: 18, yds: 94, td: 1 })],
      receiving: [],
      defense: [entry("Cal Rush(Jr)", { tackles: 9, sacks: 2 })],
    },
    maxprepsUrl: null,
    ...over,
  };
}

const build = (g: Game) => buildBoxScore(buildDataset({ teams, players, games: [g] }), g);

describe("buildBoxScore", () => {
  it("attributes each line to the right team", () => {
    const b = build(game())!;
    expect(b.home.stats.passing).toHaveLength(1);
    expect(b.away.stats.rushing).toHaveLength(1);
    // The passer is on the home roster, so he must not land on the away side.
    expect(b.away.stats.passing).toHaveLength(0);
  });

  it("keeps completions and attempts, which the weekly summary drops", () => {
    const b = build(game())!;
    expect(b.home.stats.passing[0].line).toBe("13/26, 178 YDS, 2 TD, 1 INT");
    expect(b.away.stats.rushing[0].line).toBe("18 CAR, 94 YDS, 1 TD");
    expect(b.away.stats.defense[0].line).toBe("9 TKL, 2 SACK");
  });

  it("strips the class marker off the displayed name", () => {
    expect(build(game())!.home.stats.passing[0].name).toBe("J. Long");
  });

  it("carries quarter scores and the final", () => {
    const b = build(game())!;
    expect(b.home.quarters).toEqual([7, 14, 7, 0]);
    expect(b.home.score).toBe(28);
  });

  it("still renders a game with no box score, flagging the absence", () => {
    const b = build(game({ boxScore: null }))!;
    expect(b.hasStats).toBe(false);
    expect(b.home.score).toBe(28);
    expect(b.home.quarters).toEqual([7, 14, 7, 0]);
  });

  it("counts entries it cannot attribute rather than guessing a team", () => {
    const g = game();
    g.boxScore!.passing.push(entry("Nobody Known(Sr)", { yds: 50 }));
    const b = build(g)!;
    expect(b.unattributed).toBe(1);
    expect(b.home.stats.passing).toHaveLength(1);
  });

  it("returns null for a game with no final score", () => {
    expect(build(game({ status: "scheduled", homeScore: null, awayScore: null }))).toBeNull();
  });
});
