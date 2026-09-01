import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { matchupKeyLeaders, teamKeyLeaders } from "@/lib/game-leaders";
import type { BoxScoreEntry, Game, Player, Team } from "@/lib/types";

function team(id: string): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "1A", district: null,
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

function player(
  id: string, teamId: string, name: string, position: Player["position"],
  stats: Partial<{ passYds: number; rushYds: number; tackles: number }> = {},
): Player {
  return {
    id, teamId, season: "2025-26", name, jersey: null, position,
    class: "JR", height: null, weight: null,
    stats: {
      passing: { att: 0, cmp: 0, yds: stats.passYds ?? 0, td: 0, int: 0, rating: 0 },
      rushing: { att: 0, yds: stats.rushYds ?? 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: stats.tackles ?? 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
    gamesPlayed: 1,
  };
}

function entry(playerId: string, kv: Partial<BoxScoreEntry>): BoxScoreEntry {
  return {
    playerId, cmp: null, att: null, yds: null, td: null, int: null, rec: null,
    tackles: null, sacks: null, ff: null, fgm: null, fga: null, xpm: null, xpa: null,
    ...kv,
  };
}

const teams = [team("a"), team("b")];
const players = [
  player("qa", "a", "Alan Quarter", "QB", { passYds: 900 }),
  player("ra", "a", "Randy Runner", "RB", { rushYds: 700 }),
  player("qb", "b", "Bob Thrower", "QB", { passYds: 1200 }),
  player("db", "b", "Dave Tackler", "LB", { tackles: 80 }),
];

function finalGame(): Game {
  return {
    id: "g1", season: "2025-26", week: 1, date: "2025-09-05",
    homeTeamId: "a", awayTeamId: "b", homeScore: 21, awayScore: 14,
    quarterScores: { home: [], away: [] }, status: "final", dataStatus: "complete",
    venue: null,
    boxScore: {
      passing: [
        entry("Alan Quarter(Jr)", { yds: 250, td: 3, int: 1 }),
        entry("Bob Thrower(Jr)", { yds: 180, td: 1, int: 0 }),
      ],
      rushing: [entry("Randy Runner(Jr)", { yds: 120, td: 2 })],
      receiving: [],
      defense: [entry("Dave Tackler(Jr)", { tackles: 14, sacks: 2 })],
    },
    maxprepsUrl: null,
  };
}

describe("matchupKeyLeaders", () => {
  it("uses the concluded game's box score", () => {
    const g = finalGame();
    const data = buildDataset({ teams, players, games: [g] });
    const leaders = matchupKeyLeaders(data, data.teamsById.get("a")!, data.teamsById.get("b")!, [g])!;
    expect(leaders.away.offense[0].player.name).toBe("Alan Quarter");
    expect(leaders.away.offense[0].line).toContain("250");
    expect(leaders.home.offense[0].player.name).toBe("Bob Thrower");
    expect(leaders.home.defense[0].player.name).toBe("Dave Tackler");
    expect(leaders.home.defense[0].line).toContain("14 TKL");
  });

  it("returns null before the game concludes, season stats notwithstanding", () => {
    const data = buildDataset({ teams, players, games: [] });
    expect(
      matchupKeyLeaders(data, data.teamsById.get("a")!, data.teamsById.get("b")!, []),
    ).toBeNull();
  });

  it("returns null when the game is final but has no box score", () => {
    const g = { ...finalGame(), boxScore: null };
    const data = buildDataset({ teams, players, games: [g] });
    expect(
      matchupKeyLeaders(data, data.teamsById.get("a")!, data.teamsById.get("b")!, [g]),
    ).toBeNull();
  });
});

describe("teamKeyLeaders", () => {
  it("prefers current stats, else returning projection", () => {
    const withStats = teamKeyLeaders([players[0]], null);
    expect(withStats.offense[0].player.name).toBe("Alan Quarter");
    const projected = teamKeyLeaders([], [players[2]]);
    expect(projected.offense[0].player.name).toBe("Bob Thrower");
  });
});
